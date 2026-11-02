#!/usr/bin/env python3
"""Remove backgrounds from local product photos and add a soft drop shadow."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "picture" / "monitor" / "asus" / "Image"
DEFAULT_OUTPUT = ROOT / "public" / "products" / "asus"
SUPPORTED_EXTENSIONS = {".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove backgrounds from product photos and save transparent PNGs with a soft shadow."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Source image folder.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Folder for web-ready PNGs.")
    parser.add_argument("--model", default="u2net", help="rembg model name (default: u2net).")
    parser.add_argument("--force", action="store_true", help="Regenerate outputs even when they are up to date.")
    parser.add_argument("--watch", action="store_true", help="Poll for new or changed images and process them automatically.")
    parser.add_argument("--interval", type=float, default=3.0, help="Polling interval in seconds for --watch (default: 3).")
    parser.add_argument(
        "--shadow-opacity",
        type=float,
        default=0.24,
        help="Shadow opacity from 0 to 1 (default: 0.24).",
    )
    return parser.parse_args()


def repo_path(path: Path) -> Path:
    return path.resolve() if path.is_absolute() else (ROOT / path).resolve()


def discover_images(input_dir: Path) -> list[Path]:
    if not input_dir.exists():
        input_dir.mkdir(parents=True, exist_ok=True)
    if not input_dir.is_dir():
        raise NotADirectoryError(f"Input path is not a directory: {input_dir}")
    return sorted(
        (
            path
            for path in input_dir.iterdir()
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
        ),
        key=lambda path: path.name.casefold(),
    )


def is_up_to_date(source: Path, destination: Path) -> bool:
    return destination.is_file() and destination.stat().st_mtime_ns >= source.stat().st_mtime_ns


def make_shadowed_cutout(
    image: Any,
    *,
    shadow_opacity: float,
) -> Any:
    from PIL import Image, ImageFilter

    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Background removal returned an empty transparent image.")

    subject = rgba.crop(bounds)
    longest_edge = max(subject.size)
    blur_radius = max(3, round(longest_edge * 0.018))
    offset_y = max(3, round(longest_edge * 0.022))
    pad_x = max(12, round(longest_edge * 0.045))
    pad_top = max(12, round(longest_edge * 0.045))
    pad_bottom = max(pad_top, blur_radius * 3 + offset_y + round(longest_edge * 0.035))

    canvas_size = (
        subject.width + pad_x * 2,
        subject.height + pad_top + pad_bottom,
    )
    subject_position = (pad_x, pad_top)
    shadow_position = (pad_x, pad_top + offset_y)

    blurred_alpha = subject.getchannel("A").filter(ImageFilter.GaussianBlur(blur_radius))
    shadow_mask = Image.new("L", canvas_size, 0)
    shadow_mask.paste(blurred_alpha, shadow_position)
    shadow_mask = shadow_mask.point(lambda alpha: round(alpha * shadow_opacity))

    shadow = Image.new("RGBA", canvas_size, (25, 28, 34, 0))
    shadow.putalpha(shadow_mask)

    result = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    result.alpha_composite(shadow)
    result.alpha_composite(subject, subject_position)
    return result


def process_image(
    source: Path,
    destination: Path,
    *,
    session: Any,
    shadow_opacity: float,
) -> None:
    from PIL import Image, ImageOps
    from rembg import remove

    with Image.open(source) as opened:
        prepared = ImageOps.exif_transpose(opened).convert("RGBA")

    cutout = remove(prepared, session=session)
    output = make_shadowed_cutout(cutout, shadow_opacity=shadow_opacity)
    destination.parent.mkdir(parents=True, exist_ok=True)

    temporary_path = destination.with_name(f".{destination.stem}.tmp.png")
    try:
        output.save(temporary_path, format="PNG", optimize=True)
        temporary_path.replace(destination)
    finally:
        temporary_path.unlink(missing_ok=True)


def create_session(model: str) -> Any:
    from rembg import new_session

    return new_session(model)


def process_pending(
    images: list[Path],
    output_dir: Path,
    *,
    session: Any,
    shadow_opacity: float,
    force: bool,
) -> tuple[int, int, int]:
    seen_stems: set[str] = set()
    processed = skipped = failed = 0

    for source in images:
        stem_key = source.stem.casefold()
        if stem_key in seen_stems:
            print(
                f"ERROR: Multiple source images use the name '{source.stem}'. Rename them so each output PNG is unique.",
                file=sys.stderr,
            )
            failed += 1
            continue
        seen_stems.add(stem_key)

        destination = output_dir / f"{source.stem}.png"
        if not force and is_up_to_date(source, destination):
            print(f"SKIP  {source.name} (output is current)")
            skipped += 1
            continue

        try:
            process_image(
                source,
                destination,
                session=session,
                shadow_opacity=shadow_opacity,
            )
            try:
                display_destination = destination.relative_to(ROOT)
            except ValueError:
                display_destination = destination
            print(f"DONE  {source.name} -> {display_destination}")
            processed += 1
        except Exception as error:  # Keep other photos moving if one file is invalid.
            print(f"ERROR {source.name}: {error}", file=sys.stderr)
            failed += 1

    return processed, skipped, failed


def watch_for_images(
    input_dir: Path,
    output_dir: Path,
    *,
    model: str,
    shadow_opacity: float,
    interval: float,
) -> int:
    previous: dict[Path, tuple[int, int]] = {}
    session: Any | None = None
    print(f"Watching {input_dir} every {interval:g}s. Press Ctrl+C to stop.")

    try:
        while True:
            stable: list[Path] = []
            current: dict[Path, tuple[int, int]] = {}
            for source in discover_images(input_dir):
                try:
                    stat = source.stat()
                except FileNotFoundError:
                    continue
                signature = (stat.st_size, stat.st_mtime_ns)
                current[source] = signature
                if previous.get(source) == signature:
                    stable.append(source)
            previous = current

            if stable:
                if session is None:
                    try:
                        session = create_session(model)
                    except ImportError:
                        print(
                            "ERROR: Image dependencies are missing. Run .\\scripts\\setup-image-processor.ps1 first.",
                            file=sys.stderr,
                        )
                        return 2
                    except Exception as error:
                        print(f"ERROR: Could not load rembg model '{model}': {error}", file=sys.stderr)
                        return 2
                process_pending(
                    stable,
                    output_dir,
                    session=session,
                    shadow_opacity=shadow_opacity,
                    force=False,
                )
            time.sleep(interval)
    except KeyboardInterrupt:
        print("Stopped image processor.")
        return 0
    except OSError as error:
        print(f"ERROR while watching the input folder: {error}", file=sys.stderr)
        return 1


def main() -> int:
    args = parse_args()
    if args.interval <= 0:
        print("ERROR: --interval must be greater than zero.", file=sys.stderr)
        return 2
    if not 0 <= args.shadow_opacity <= 1:
        print("ERROR: --shadow-opacity must be between 0 and 1.", file=sys.stderr)
        return 2

    input_dir = repo_path(args.input)
    output_dir = repo_path(args.output)
    try:
        input_dir.mkdir(parents=True, exist_ok=True)
        output_dir.mkdir(parents=True, exist_ok=True)
        images = discover_images(input_dir)
    except OSError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    if not images:
        print(f"No supported images found in {input_dir}")
        print("Supported formats: BMP, JPEG, PNG, TIFF, WEBP.")
        if not args.watch:
            return 0

    if args.watch:
        return watch_for_images(
            input_dir,
            output_dir,
            model=args.model,
            shadow_opacity=args.shadow_opacity,
            interval=args.interval,
        )

    try:
        session = create_session(args.model)
    except ImportError:
        print(
            "ERROR: Image dependencies are missing. Run .\\scripts\\setup-image-processor.ps1 first.",
            file=sys.stderr,
        )
        return 2
    except Exception as error:
        print(f"ERROR: Could not load rembg model '{args.model}': {error}", file=sys.stderr)
        return 2

    processed, skipped, failed = process_pending(
        images,
        output_dir,
        session=session,
        shadow_opacity=args.shadow_opacity,
        force=args.force,
    )
    print(f"Finished: {processed} processed, {skipped} skipped, {failed} failed.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
