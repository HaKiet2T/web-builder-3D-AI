import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { PRODUCT_RECORDS } from '../src/lib/catalog/sample-data.ts';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

const keyboardPage = readFileSync('src/app/keyboard/page.tsx', 'utf8');
const keyboardStorefront = readFileSync('src/components/ui/KeyboardStorefront.tsx', 'utf8');
const categoryPage = readFileSync('src/app/[category]/page.tsx', 'utf8');
const globalsCss = readFileSync('src/app/globals.css', 'utf8');

describe('Keyboard Storefront Architecture & Interactive Rail UI', () => {
  describe('Routing & Page Shell Contracts', () => {
    it('serves dedicated /keyboard route with Suspense streaming fallback', () => {
      assert.ok(existsSync('src/app/keyboard/page.tsx'), 'keyboard/page.tsx must exist');
      assert.match(keyboardPage, /export default function KeyboardPage/);
      assert.match(keyboardPage, /<Suspense/);
      assert.match(keyboardPage, /listProductsByCategory\('keyboard'\)/);
      assert.match(keyboardPage, /<KeyboardStorefront/);
    });

    it('excludes keyboard from dynamic [category] static generation to avoid collisions', () => {
      assert.match(categoryPage, /category\.id !== 'keyboard'/);
      assert.match(categoryPage, /category\.id !== 'monitor'/);
    });
  });

  describe('Keyboard Catalogue Data & 8 Sample Products', () => {
    const keyboards = PRODUCT_RECORDS.filter((p) => p.categoryId === 'keyboard');

    it('contains at least 8 keyboard products in sample catalogue for rich showcase', () => {
      assert.ok(keyboards.length >= 8, `Expected at least 8 keyboards, found ${keyboards.length}`);
    });

    it('includes diverse brands and switch varieties across the 8 keyboards', () => {
      const brands = new Set(keyboards.map((k) => k.brand));
      assert.ok(brands.has('ASUS ROG'), 'Should include ASUS ROG');
      assert.ok(brands.has('Keychron'), 'Should include Keychron');
      assert.ok(brands.has('NuPhy'), 'Should include NuPhy');
      assert.ok(brands.has('Wooting'), 'Should include Wooting');
      assert.ok(brands.has('AKKO'), 'Should include AKKO');
      assert.ok(brands.has('Varmilo'), 'Should include Varmilo');
    });

    it('formats price into standard Vietnamese currency string with symbol', () => {
      assert.equal(formatPrice(4690000), '4.690.000₫');
      assert.equal(formatPrice(1590000), '1.590.000₫');
    });
  });

  describe('Left Information Panel & Interactive Controls', () => {
    it('displays brand, title, highlights, and active variant selector', () => {
      assert.match(keyboardStorefront, /className="keyboard-brand-tag"/);
      assert.match(keyboardStorefront, /className="keyboard-title"/);
      assert.match(keyboardStorefront, /className="keyboard-highlights-list"/);
      assert.match(keyboardStorefront, /className="keyboard-variant-pills"/);
    });

    it('integrates Add To Cart action with useCartStore and slide-over opening', () => {
      assert.match(keyboardStorefront, /useCartStore\.getState\(\)\.addItem/);
      assert.match(keyboardStorefront, /useCartStore\.getState\(\)\.openCart/);
      assert.match(keyboardStorefront, /keyboard-add-cart-btn/);
    });

    it('pins fixed top header with breadcrumb and collection badge elevated at column top', () => {
      assert.match(keyboardStorefront, /className="keyboard-pinned-header"/);
      assert.match(keyboardStorefront, /className="keyboard-top-meta"/);
      assert.match(keyboardStorefront, /className="keyboard-info-scroll-body"/);
      assert.match(globalsCss, /\.keyboard-pinned-header/);
      assert.match(globalsCss, /\.keyboard-info-scroll-body/);
      assert.match(globalsCss, /border-bottom: 1px solid var\(--line\)/);
      assert.match(globalsCss, /padding-top: 20px/);
      assert.doesNotMatch(globalsCss, /\.keyboard-info-scroll-body > :first-child/);
      assert.doesNotMatch(globalsCss, /\.keyboard-info-scroll-body > :last-child/);
    });

    it('provides keyboard navigation controls and counter indicator', () => {
      assert.match(keyboardStorefront, /keyboard-counter-group/);
      assert.match(keyboardStorefront, /keyboard-nav-btn/);
      assert.match(keyboardStorefront, /keyboard-dot-nav/);
    });

    it('removes unnecessary mouse scroll hint and balances layout with trust reassurance badges', () => {
      assert.doesNotMatch(keyboardStorefront, /keyboard-scroll-hint/);
      assert.doesNotMatch(globalsCss, /\.keyboard-scroll-hint/);
      assert.match(keyboardStorefront, /className="keyboard-trust-row"/);
      assert.match(globalsCss, /\.keyboard-trust-row/);
    });
  });

  describe('Right Sliding Rail Physics & Center Zoom Mechanics', () => {
    it('implements momentum wheel, pointer drag and velocity damping loop', () => {
      assert.match(keyboardStorefront, /requestAnimationFrame/);
      assert.match(keyboardStorefront, /onWheel/);
      assert.match(keyboardStorefront, /handlePointerDown/);
      assert.match(keyboardStorefront, /handlePointerMove/);
      assert.match(keyboardStorefront, /handlePointerUp/);
      assert.match(keyboardStorefront, /velocityRef\.current/);
    });

    it('calculates continuous center zoom proximity with dynamic scale and opacity', () => {
      assert.match(keyboardStorefront, /0\.74 \+ 0\.44 \* proximity/);
      assert.match(keyboardStorefront, /0\.36 \+ 0\.64 \* proximity/);
      assert.match(keyboardStorefront, /--kb-scale/);
      assert.match(keyboardStorefront, /--kb-opacity/);
      assert.match(keyboardStorefront, /--kb-tilt/);
    });

    it('defines responsive CSS styles and hardware-accelerated transforms in globals.css', () => {
      assert.match(globalsCss, /\.keyboard-storefront-wrapper/);
      assert.match(globalsCss, /\.keyboard-rail-card/);
      assert.match(globalsCss, /--kb-scale/);
      assert.match(globalsCss, /perspective\(900px\)/);
      assert.match(globalsCss, /@media \(max-width: 1024px\)/);
    });

    it('scales product artwork to 420px (2x hero size) and enlarges rail cards', () => {
      assert.match(keyboardStorefront, /maxHeight: 420/);
      assert.match(keyboardStorefront, /ITEM_HEIGHT = 380/);
      assert.match(globalsCss, /max-height: 420px/);
      assert.match(globalsCss, /height: 440px/);
    });

    it('completely removes floating product info box under image for clean presentation', () => {
      assert.doesNotMatch(keyboardStorefront, /keyboard-card-meta/);
      assert.doesNotMatch(keyboardStorefront, /className="keyboard-card-brand"/);
      assert.doesNotMatch(globalsCss, /\.keyboard-card-meta/);
    });

    it('wraps product image in Next.js Link navigating to product detail route with drag safety', () => {
      assert.match(keyboardStorefront, /href=\{`\/keyboard\/\$\{product\.slug\}`\}/);
      assert.match(keyboardStorefront, /className="keyboard-artwork-link"/);
      assert.match(keyboardStorefront, /hasMovedRef/);
      assert.match(keyboardStorefront, /handleArtworkClick/);
      assert.match(keyboardStorefront, /router\.push\(`\/keyboard\/\$\{productSlug\}`\)/);
      assert.match(globalsCss, /\.keyboard-artwork-link/);
    });
  });

  describe('Entrance Slide-Down & Deceleration Animation on Page Load', () => {
    it('defines GPU-accelerated entrance keyframes with cubic-bezier deceleration curve in CSS', () => {
      assert.match(globalsCss, /@keyframes keyboard-rail-slide-down/);
      assert.match(globalsCss, /transform: translateY\(-28px\)/);
      assert.match(globalsCss, /cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
      assert.match(globalsCss, /\.keyboard-rail-column\s*\{[^}]*animation:[^}]*keyboard-rail-slide-down/);
      assert.match(globalsCss, /animation:[^}]*keyboard-rail-slide-down\s+1\.7s/);
    });

    it('implements physics-driven downward slide with smooth spring damping in KeyboardStorefront', () => {
      assert.match(keyboardStorefront, /ENTRANCE_OFFSET_PX/);
      assert.match(keyboardStorefront, /entranceOffsetRef/);
      assert.match(keyboardStorefront, /isEnteringRef/);
      assert.match(keyboardStorefront, /entranceOffsetRef\.current\s*\+=\s*\(0\s*-\s*entranceOffsetRef\.current\)\s*\*\s*0\.041/);
    });

    it('smoothly hands over entrance animation when user interacts via pointer or wheel', () => {
      assert.match(keyboardStorefront, /handlePointerDown[\s\S]*?entranceOffsetRef\.current\s*=\s*0/);
      assert.match(keyboardStorefront, /onWheel[\s\S]*?entranceOffsetRef\.current\s*=\s*0/);
    });
  });

  describe('Strict Em Dash Ban (U+2014) Compliance', () => {
    it('guarantees zero em dash characters across all new keyboard storefront files', () => {
      assert.doesNotMatch(keyboardStorefront, /\u2014/, 'KeyboardStorefront must not contain em dash');
      assert.doesNotMatch(keyboardPage, /\u2014/, 'keyboard/page.tsx must not contain em dash');
      assert.doesNotMatch(globalsCss, /\u2014/, 'globals.css must not contain em dash');
    });
  });
});
