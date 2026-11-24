import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const roomStageTsx = readFileSync('src/components/room/RoomStage.tsx', 'utf8');
const roomStageCss = readFileSync('src/components/room/room-stage.css', 'utf8');
const roomViewerTsx = readFileSync('src/components/room/RoomViewer.tsx', 'utf8');
const roomViewerCss = readFileSync('src/components/room/room-viewer.css', 'utf8');
const mauSetupPageTsx = readFileSync('src/app/mau-setup/page.tsx', 'utf8');
const khongGianSlugTsx = readFileSync('src/app/khong-gian/[slug]/page.tsx', 'utf8');

describe('Room Setup Storefront Viewer & Combo Cart (Giai doan 3)', () => {
  describe('Dynamic Storefront Routing & Data Layer Integration', () => {
    it('integrates listPublishedRoomSetups in mau-setup page', () => {
      assert.match(mauSetupPageTsx, /import\s*\{\s*listPublishedRoomSetups\s*\}\s*from\s*'@\/lib\/room\/dal'/);
      assert.match(mauSetupPageTsx, /const\s+setups\s*=\s*await\s+listPublishedRoomSetups\(\)/);
      assert.match(mauSetupPageTsx, /setup\.comboDiscountPct\s*>\s*0/);
      assert.match(mauSetupPageTsx, /\/khong-gian\/\$\{setup\.slug\}/);
    });

    it('implements dynamic getRoomSetupBySlug and generateMetadata in khong-gian/[slug]', () => {
      assert.match(khongGianSlugTsx, /import\s*\{[^}]*getRoomSetupBySlug[^}]*\}\s*from\s*'@\/lib\/room\/dal'/);
      assert.match(khongGianSlugTsx, /const\s+setup\s*=\s*await\s+getRoomSetupBySlug\(slug\)/);
      assert.match(khongGianSlugTsx, /if\s*\(!setup\)\s*\{\s*notFound\(\);\s*\}/);
      assert.match(khongGianSlugTsx, /generateStaticParams/);
      assert.match(khongGianSlugTsx, /<RoomViewer\s+setup=\{setup\}\s*\/>/);
    });
  });

  describe('RoomStage Interactive Hover Card & Tactile Pins', () => {
    it('renders interactive hover card with product title, stock badge, variant, and price in view mode', () => {
      assert.match(roomStageTsx, /room-item-hovercard/);
      assert.match(roomStageTsx, /room-item-hovercard-title/);
      assert.match(roomStageTsx, /room-item-hovercard-badge/);
      assert.match(roomStageTsx, /room-item-hovercard-price/);
      assert.match(roomStageTsx, /room-item-hovercard-cta/);
      assert.match(roomStageCss, /\.room-item-hovercard/);
      assert.match(roomStageCss, /\.room-item-hovercard-inner/);
    });

    it('flips hover card position downwards when item is near the top of the canvas', () => {
      assert.match(roomStageTsx, /item\.yPct\s*<\s*32\s*\?\s*'room-item-hovercard--bottom'\s*:\s*'room-item-hovercard--top'/);
      assert.match(roomStageCss, /\.room-item-hovercard--bottom\s*\{\s*top:\s*100%;/);
      assert.match(roomStageCss, /\.room-item-hovercard--top\s*\{\s*bottom:\s*100%;/);
    });

    it('counteracts horizontal flip so hover card text and icons are never mirrored', () => {
      assert.match(roomStageTsx, /scaleX\(\$\{item\.flipX\s*\?\s*-1\s*:\s*1\}\)/);
    });

    it('preserves pointer-events: none on decor items in view mode', () => {
      assert.match(roomStageTsx, /mode === 'view' && item\.itemType === 'decor'\s*\?\s*'room-stage-item--view-decor'/);
      assert.match(roomStageCss, /\.room-stage-item--view-decor\s*\{\s*pointer-events:\s*none;/);
    });
  });

  describe('RoomViewer Component & Combo Cart State Architecture', () => {
    it('manages synchronized hover and select states between RoomStage and Product Dock', () => {
      assert.match(roomViewerTsx, /const\s+\[hoveredItemId,\s*setHoveredItemId\]\s*=\s*useState<string\s*\|\s*null>\(null\)/);
      assert.match(roomViewerTsx, /const\s+\[selectedItemId,\s*setSelectedItemId\]\s*=\s*useState<string\s*\|\s*null>\(null\)/);
      assert.match(roomViewerTsx, /room-dock-scroll/);
      assert.match(roomViewerTsx, /room-dock-card/);
      assert.match(roomViewerTsx, /room-dock-card--active/);
    });

    it('provides interactive checklist allowing shoppers to uncheck items already owned', () => {
      assert.match(roomViewerTsx, /const\s+\[selectedComboIds,\s*setSelectedComboIds\]\s*=\s*useState/);
      assert.match(roomViewerTsx, /handleToggleComboItem/);
      assert.match(roomViewerTsx, /handleSelectAll/);
      assert.match(roomViewerTsx, /handleDeselectAll/);
      assert.match(roomViewerTsx, /className="room-combo-checkbox"/);
    });

    it('calculates live combo pricing and applies discount conditionally for 2+ products', () => {
      assert.match(roomViewerTsx, /calculateComboPricing/);
      assert.match(roomViewerTsx, /selectedProductItems\.length\s*>=\s*2\s*\?\s*setup\.comboDiscountPct\s*:\s*0/);
      assert.match(roomViewerTsx, /comboPricing\.originalTotal/);
      assert.match(roomViewerTsx, /comboPricing\.discountAmount/);
      assert.match(roomViewerTsx, /comboPricing\.finalTotal/);
    });

    it('adds selected items into useCartStore and opens slide-out cart drawer', () => {
      assert.match(roomViewerTsx, /const\s+addItem\s*=\s*useCartStore\(\(state\)\s*=>\s*state\.addItem\)/);
      assert.match(roomViewerTsx, /const\s+openCart\s*=\s*useCartStore\(\(state\)\s*=>\s*state\.openCart\)/);
      assert.match(roomViewerTsx, /handleAddComboToCart/);
      assert.match(roomViewerTsx, /openCart\(\)/);
      assert.match(roomViewerTsx, /room-combo-success-alert/);
    });
  });

  describe('System Invariant & Typography Compliance', () => {
    it('strictly avoids the forbidden em dash character (U+2014) across all touched files', () => {
      const emDashRegex = /\u2014/;
      assert.doesNotMatch(roomStageTsx, emDashRegex, 'RoomStage.tsx contains em dash');
      assert.doesNotMatch(roomStageCss, emDashRegex, 'room-stage.css contains em dash');
      assert.doesNotMatch(roomViewerTsx, emDashRegex, 'RoomViewer.tsx contains em dash');
      assert.doesNotMatch(roomViewerCss, emDashRegex, 'room-viewer.css contains em dash');
      assert.doesNotMatch(mauSetupPageTsx, emDashRegex, 'mau-setup/page.tsx contains em dash');
      assert.doesNotMatch(khongGianSlugTsx, emDashRegex, 'khong-gian/[slug]/page.tsx contains em dash');
    });
  });
});
