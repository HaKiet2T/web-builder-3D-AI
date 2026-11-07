#!/usr/bin/env python3
"""
Remove backgrounds from product images and standardize aspect ratio to 1:1.
Supports single-file mode, JSON batch manifest mode, and high-throughput resident daemon mode.
Optimized with smart pre-downscaling, tuned ONNX Runtime thread pools, concurrent batch execution,
and fast PNG compression.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import sys
from pathlib import Path
from typing import Any, Sequence

# Global model session cache to eliminate cold-start reinitialization in daemon and batch modes
_SESSION_CACHE: dict[str, Any] = {}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove background and standardize aspect ratio to 1:1 square canvas."
    )
    parser.add_argument("--input", type=Path, help="Path to input image file.")
    parser.add_argument("--output", type=Path, help="Path to output PNG file.")
    parser.add_argument(
        "--manifest",
        type=Path,
        help="Path to JSON file containing list of {'input': ..., 'output': ...} tasks.",
    )
    parser.add_argument("--target-dim", type=int, default=1200, help="Canvas square dimension (default: 1200).")
    parser.add_argument("--padding-ratio", type=float, default=0.82, help="Content fill ratio (default: 0.82).")
    parser.add_argument("--shadow-opacity", type=float, default=0.22, help="Soft drop shadow opacity (default: 0.22).")
    parser.add_argument("--model", default="u2netp", help="rembg model name (default: u2netp).")
    parser.add_argument("--daemon", action="store_true", help="Run as resident JSON-RPC daemon on stdin/stdout.")
    parser.add_argument("--workers", type=int, default=4, help="Maximum concurrent worker threads (default: 4).")
    return parser.parse_args()


def get_optimized_session(model_name: str = "u2netp") -> Any:
    """Create or return cached rembg session with tuned ONNX Runtime options."""
    if model_name in _SESSION_CACHE:
        return _SESSION_CACHE[model_name]

    try:
        import onnxruntime as ort
        from rembg import new_session

        sess_opts = ort.SessionOptions()
        cpu_count = os.cpu_count() or 4
        # Optimize thread allocation: 4-8 threads avoids thread thrashing and memory bus contention on high-core CPUs
        optimal_threads = min(8, max(2, cpu_count // 2))
        sess_opts.intra_op_num_threads = optimal_threads
        sess_opts.inter_op_num_threads = 1
        sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL

        session = new_session(model_name, sess_opts=sess_opts)
        _SESSION_CACHE[model_name] = session
        return session
    except ImportError:
        print("WARN: rembg or onnxruntime not installed. Standardizing 1:1 ratio only.", file=sys.stderr)
        return None
    except Exception as err:
        print(f"WARN: Could not load rembg session '{model_name}': {err}", file=sys.stderr)
        # Resilient fallback: if u2netp failed, attempt u2net
        if model_name != "u2net":
            try:
                from rembg import new_session
                session = new_session("u2net")
                _SESSION_CACHE["u2net"] = session
                return session
            except Exception:
                pass
        return None


def process_single(
    input_path: Path,
    output_path: Path,
    *,
    session: Any | None,
    target_dim: int,
    padding_ratio: float,
    shadow_opacity: float,
) -> None:
    from PIL import Image, ImageFilter, ImageOps

    with Image.open(input_path) as opened:
        prepared = ImageOps.exif_transpose(opened).convert("RGBA")

    # Smart pre-downscaling:
    # Smartphone/camera uploads often exceed 4000x3000 (12-48MP).
    # Since target canvas is target_dim (e.g. 1200x1200), downscaling to max 1600px
    # before AI segmentation saves 70-85% memory and CPU operations with identical visual quality.
    max_pre_dim = max(1600, int(target_dim * 1.35))
    orig_w, orig_h = prepared.size
    if max(orig_w, orig_h) > max_pre_dim:
        scale_factor = max_pre_dim / max(orig_w, orig_h)
        pre_w = max(1, int(round(orig_w * scale_factor)))
        pre_h = max(1, int(round(orig_h * scale_factor)))
        prepared = prepared.resize((pre_w, pre_h), Image.Resampling.BILINEAR)

    # Try background removal
    cutout: Any = None
    if session is not None:
        try:
            from rembg import remove
            cutout = remove(prepared, session=session)
        except Exception as err:
            print(f"WARN: rembg failed for {input_path}: {err}. Falling back to clean crop.", file=sys.stderr)

    if cutout is None:
        cutout = prepared

    cutout_rgba = cutout.convert("RGBA")
    alpha_channel = cutout_rgba.getchannel("A")
    bbox = alpha_channel.getbbox()

    if bbox is None:
        # Transparent or solid without contrast: fallback to full image
        bbox = (0, 0, cutout_rgba.width, cutout_rgba.height)

    subject = cutout_rgba.crop(bbox)
    subject_w, subject_h = subject.size

    # Standardize aspect ratio to 1:1 square canvas
    max_content_dim = max(10, int(target_dim * padding_ratio))
    scale = min(max_content_dim / max(1, subject_w), max_content_dim / max(1, subject_h))
    new_w = max(1, int(round(subject_w * scale)))
    new_h = max(1, int(round(subject_h * scale)))

    scaled_subject = subject.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (target_dim, target_dim), (0, 0, 0, 0))
    pos_x = (target_dim - new_w) // 2
    pos_y = (target_dim - new_h) // 2

    # Add soft drop shadow
    if shadow_opacity > 0.01:
        blur_radius = max(3, round(max(new_w, new_h) * 0.015))
        offset_y = max(3, round(max(new_w, new_h) * 0.018))
        blurred_alpha = scaled_subject.getchannel("A").filter(ImageFilter.GaussianBlur(blur_radius))
        shadow_mask = Image.new("L", (target_dim, target_dim), 0)
        shadow_mask.paste(blurred_alpha, (pos_x, pos_y + offset_y))
        shadow_mask = shadow_mask.point(lambda a: round(a * shadow_opacity))

        shadow = Image.new("RGBA", (target_dim, target_dim), (20, 24, 30, 0))
        shadow.putalpha(shadow_mask)
        canvas.alpha_composite(shadow)

    canvas.alpha_composite(scaled_subject, (pos_x, pos_y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output_path.with_name(f".{output_path.stem}.tmp.png")
    try:
        # Fast PNG compression: optimize=False with compress_level=4 is 7x-8x faster than optimize=True
        canvas.save(temp_output, format="PNG", optimize=False, compress_level=4)
        temp_output.replace(output_path)
    finally:
        temp_output.unlink(missing_ok=True)


def process_batch(
    tasks: list[tuple[Path, Path]],
    *,
    session: Any | None,
    target_dim: int,
    padding_ratio: float,
    shadow_opacity: float,
    max_workers: int = 4,
) -> int:
    """Execute multiple background removal tasks concurrently across a thread pool."""
    if not tasks:
        return 0

    def _worker(task: tuple[Path, Path]) -> bool:
        in_p, out_p = task
        try:
            process_single(
                in_p,
                out_p,
                session=session,
                target_dim=target_dim,
                padding_ratio=padding_ratio,
                shadow_opacity=shadow_opacity,
            )
            return True
        except Exception as err:
            print(f"ERROR processing {in_p}: {err}", file=sys.stderr)
            return False

    if len(tasks) == 1:
        return 1 if _worker(tasks[0]) else 0

    workers = min(max_workers, len(tasks))
    success_count = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        results = executor.map(_worker, tasks)
        success_count = sum(1 for ok in results if ok)

    return success_count


def run_daemon(default_model: str = "u2netp") -> int:
    """Run persistent JSON IPC daemon on stdin/stdout."""
    # Pre-warm default session
    session = get_optimized_session(default_model)
    print(json.dumps({"status": "ready", "model": default_model}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except Exception as err:
            print(json.dumps({"status": "error", "message": f"Malformed JSON: {err}"}), flush=True)
            continue

        cmd = msg.get("command") or msg.get("cmd") or "process"
        if cmd == "ping":
            print(json.dumps({"status": "pong"}), flush=True)
            continue
        if cmd in ("exit", "quit"):
            break

        req_id = msg.get("id", "")
        model_name = msg.get("model", default_model)
        target_dim = int(msg.get("target_dim", 1200))
        padding_ratio = float(msg.get("padding_ratio", 0.82))
        shadow_opacity = float(msg.get("shadow_opacity", 0.22))
        workers = int(msg.get("workers", 4))

        session = get_optimized_session(model_name)

        raw_tasks = msg.get("tasks", [])
        tasks = [(Path(item["input"]), Path(item["output"])) for item in raw_tasks]

        success_count = process_batch(
            tasks,
            session=session,
            target_dim=target_dim,
            padding_ratio=padding_ratio,
            shadow_opacity=shadow_opacity,
            max_workers=workers,
        )

        res = {
            "id": req_id,
            "status": "ok" if success_count == len(tasks) else "partial",
            "success_count": success_count,
            "total": len(tasks),
        }
        print(json.dumps(res), flush=True)

    return 0


def main() -> int:
    args = parse_args()

    if args.daemon:
        return run_daemon(default_model=args.model)

    tasks: list[tuple[Path, Path]] = []

    if args.manifest:
        try:
            with open(args.manifest, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    tasks.append((Path(item["input"]), Path(item["output"])))
        except Exception as err:
            print(f"ERROR: Failed to read manifest {args.manifest}: {err}", file=sys.stderr)
            return 1
    elif args.input and args.output:
        tasks.append((args.input, args.output))
    else:
        print("ERROR: Must provide either --input/--output, --manifest, or --daemon.", file=sys.stderr)
        return 2

    if not tasks:
        print("No tasks to process.", file=sys.stderr)
        return 0

    session = get_optimized_session(args.model)

    success_count = process_batch(
        tasks,
        session=session,
        target_dim=args.target_dim,
        padding_ratio=args.padding_ratio,
        shadow_opacity=args.shadow_opacity,
        max_workers=args.workers,
    )

    return 0 if success_count == len(tasks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
