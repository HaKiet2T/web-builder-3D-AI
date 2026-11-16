export type DockPosition = 'bottom-right' | 'bottom-left';

export interface ViewportDimensions {
  innerWidth: number;
  innerHeight: number;
}

/**
 * Clamps raw drag offsets so the ChatWidget remains safely within the screen viewport.
 * Avoids any scenario where the chat widget is pushed offscreen or overlaps browser edges.
 */
export function clampDragOffset(
  rawX: number,
  rawY: number,
  dock: DockPosition,
  containerEl?: { getBoundingClientRect?: () => { width: number; height: number } } | null,
  customViewport?: ViewportDimensions
): { x: number; y: number } {
  const winW = customViewport?.innerWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const winH = customViewport?.innerHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 800);

  const padding = 12; // Margin from viewport edge
  const rect = containerEl?.getBoundingClientRect?.();
  const width = rect?.width ?? 380;
  const height = rect?.height ?? 500;

  let minX: number;
  let maxX: number;

  if (dock === 'bottom-left') {
    // Un-translated: left is 24px (1.5rem)
    minX = padding - 24;
    maxX = Math.max(minX, winW - padding - 24 - width);
  } else {
    // bottom-right: Un-translated: right is 24px (1.5rem)
    minX = Math.min(12, padding - (winW - 24 - width));
    maxX = 12;
  }

  // Top edge: (winH - 24 - height) + y >= padding => y >= padding - (winH - 24 - height)
  const minY = Math.min(12, padding - (winH - 24 - height));
  const maxY = 12;

  const clampedX = Math.min(Math.max(rawX, minX), maxX);
  const clampedY = Math.min(Math.max(rawY, minY), maxY);

  return { x: Math.round(clampedX), y: Math.round(clampedY) };
}
