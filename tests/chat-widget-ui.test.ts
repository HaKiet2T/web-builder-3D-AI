import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

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

  it('ensures no em dash characters exist in ChatWidget source', () => {
    assert.doesNotMatch(widgetContent, /\u2014/);
  });
});
