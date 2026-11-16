import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { clampDragOffset } from '../src/lib/chat/positioning.ts';

describe('ChatWidget Flexible Positioning & Cart Collision Avoidance', () => {
  const widgetContent = readFileSync('src/components/chat/ChatWidget.tsx', 'utf8');

  it('imports useCartStore to listen to cart drawer state', () => {
    assert.match(widgetContent, /useCartStore/);
    assert.match(widgetContent, /state\.isOpen/);
  });

  it('provides dynamic dock positioning to avoid obscuring checkout buttons', () => {
    // Must support both bottom-right and bottom-left positions
    assert.match(widgetContent, /dockPosition/);
    assert.match(widgetContent, /bottom-left/);
    assert.match(widgetContent, /bottom-right/);
    // Must dynamically react when cart drawer is open
    assert.match(widgetContent, /isCartOpen/);
  });

  it('includes interactive dock switcher control in UI', () => {
    // Should have toggle dock button for user control
    assert.match(widgetContent, /handleToggleDock/);
    assert.match(widgetContent, /aria-label=.*(vị trí|bên trái|bên phải|dock)/i);
  });

  it('provides minimize / compact mode for the chat window', () => {
    assert.match(widgetContent, /isMinimized/);
    assert.match(widgetContent, /handleToggleMinimize/);
    assert.match(widgetContent, /aria-label=.*(thu nhỏ|mở rộng|minimize)/i);
  });

  it('supports drag handle or repositioning to prevent covering other elements', () => {
    assert.match(widgetContent, /(isDragging|dragOffset|onPointerDown|handleDrag)/);
  });

  it('prevents launcher lockup and ensures reopening is resilient after drag and close cycles', () => {
    // Must NOT have stale hasMoved guard blocking launcher button open
    assert.doesNotMatch(
      widgetContent,
      /onClick=\{\(\)\s*=>\s*\{\s*if\s*\(!hasMovedRef\.current\)\s*\{\s*setIsOpen\(true\)/,
      'Launcher button onClick must not be permanently blocked by un-reset hasMovedRef'
    );
    // Must ensure clean reset / handler for closing chat
    assert.match(widgetContent, /handleClose|setIsOpen\(false\)/);
  });

  it('disables CSS transition while dragging to eliminate UI lag and freezing (transition-none)', () => {
    assert.match(
      widgetContent,
      /isDragging\s*\?\s*['"][^'"]*transition-none[^'"]*['"]/,
      'Must apply transition-none when isDragging is true to prevent 300ms transition lag during drag'
    );
  });

  it('enforces screen boundary clamping so widget cannot be dragged offscreen', () => {
    assert.match(
      widgetContent,
      /clampDragOffset/,
      'Must clamp drag offset to viewport boundaries using clampDragOffset'
    );

    // Functional tests for clampDragOffset when window is simulated
    const originalWindow = globalThis.window;
    try {
      (globalThis as unknown as { window: { innerWidth: number; innerHeight: number } }).window = {
        innerWidth: 1200,
        innerHeight: 800,
      };

      const mockElement = {
        getBoundingClientRect: () => ({ width: 400, height: 500 }),
      } as unknown as HTMLElement;

      // When dragging far to the left in bottom-right dock:
      // Left edge starts at 1200 - 24 - 400 = 776.
      // Padding is 12px. Minimum allowed X translation is 12 - 776 = -764.
      const clampedFarLeft = clampDragOffset(-2000, 0, 'bottom-right', mockElement);
      assert.equal(clampedFarLeft.x, -764);

      // When dragging far to the right in bottom-right dock: max X is 12px
      const clampedFarRight = clampDragOffset(500, 0, 'bottom-right', mockElement);
      assert.equal(clampedFarRight.x, 12);

      // When dragging far up in bottom-right dock:
      // Top edge starts at 800 - 24 - 500 = 276.
      // Padding is 12px. Minimum allowed Y translation is 12 - 276 = -264.
      const clampedFarUp = clampDragOffset(0, -2000, 'bottom-right', mockElement);
      assert.equal(clampedFarUp.y, -264);

      // When dragging far down in bottom-right dock: max Y is 12px
      const clampedFarDown = clampDragOffset(0, 500, 'bottom-right', mockElement);
      assert.equal(clampedFarDown.y, 12);

      // When using bottom-left dock:
      // Un-translated left is 24px. Minimum X translation is 12 - 24 = -12px.
      const clampedBLFarLeft = clampDragOffset(-500, 0, 'bottom-left', mockElement);
      assert.equal(clampedBLFarLeft.x, -12);

      // Maximum X translation for bottom-left: 1200 - 12 - 24 - 400 = 764px.
      const clampedBLFarRight = clampDragOffset(2000, 0, 'bottom-left', mockElement);
      assert.equal(clampedBLFarRight.x, 764);
    } finally {
      if (originalWindow) {
        globalThis.window = originalWindow;
      } else {
        delete (globalThis as unknown as { window?: unknown }).window;
      }
    }
  });

  it('registers pointercancel event listener to prevent getting stuck in dragging state', () => {
    assert.match(
      widgetContent,
      /pointercancel/,
      'Must listen to pointercancel to prevent stuck dragging state on touch/gesture cancel'
    );
  });

  it('ensures no em dash characters exist in ChatWidget and positioning sources', () => {
    assert.doesNotMatch(widgetContent, /\u2014/);
    const positioningContent = readFileSync('src/lib/chat/positioning.ts', 'utf8');
    assert.doesNotMatch(positioningContent, /\u2014/);
  });
});
