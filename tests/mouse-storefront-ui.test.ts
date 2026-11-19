import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { PRODUCT_RECORDS } from '../src/lib/catalog/sample-data.ts';

const mousePage = readFileSync('src/app/mouse/page.tsx', 'utf8');
const mouseStorefront = readFileSync('src/components/ui/MouseStorefront.tsx', 'utf8');
const mouseCss = readFileSync('src/app/mouse/mouse.css', 'utf8');
const categoryPage = readFileSync('src/app/[category]/page.tsx', 'utf8');
const globalsCss = readFileSync('src/app/globals.css', 'utf8');
const mouseAdapter = readFileSync('src/lib/catalog/mouse-adapter.ts', 'utf8');
const miceData = readFileSync('src/data/mice.ts', 'utf8');
const chatWidget = readFileSync('src/components/chat/ChatWidget.tsx', 'utf8');

describe('Mouse Storefront Architecture & 2D Orbit Ring UI', () => {
  describe('Routing & Page Shell Contracts', () => {
    it('serves dedicated /mouse route with Suspense streaming fallback', () => {
      assert.ok(existsSync('src/app/mouse/page.tsx'), 'mouse/page.tsx must exist');
      assert.match(mousePage, /export default function MousePage/);
      assert.match(mousePage, /<Suspense/);
      assert.match(mousePage, /listProductsByCategory\('mouse'\)/);
      assert.match(mousePage, /toMouseProducts/);
      assert.match(mousePage, /<MouseStorefront/);
    });

    it('excludes mouse from dynamic [category] static generation to prioritize bespoke showcase', () => {
      assert.match(categoryPage, /category\.id !== 'mouse'/);
      assert.match(categoryPage, /category\.id !== 'monitor'/);
      assert.match(categoryPage, /category\.id !== 'keyboard'/);
    });
  });

  describe('Mouse Catalogue Data & 6 Sample Products', () => {
    const mice = PRODUCT_RECORDS.filter((p) => p.categoryId === 'mouse');

    it('contains at least 6 mouse products in sample catalogue for rich showcase', () => {
      assert.ok(mice.length >= 6, `Expected at least 6 mice, found ${mice.length}`);
    });

    it('includes authentic ASUS ROG gaming lineup with specialized mouse attributes', () => {
      const names = mice.map((m) => m.name);
      assert.ok(names.some((n) => n.includes('Harpe Ace')), 'Should include Harpe Ace');
      assert.ok(names.some((n) => n.includes('Keris II Ace')), 'Should include Keris II Ace');
      assert.ok(names.some((n) => n.includes('Chakram X')), 'Should include Chakram X');
      assert.ok(names.some((n) => n.includes('Spatha X')), 'Should include Spatha X');
      assert.ok(names.some((n) => n.includes('Gladius III')), 'Should include Gladius III');
      assert.ok(names.some((n) => n.includes('Strix Impact III')), 'Should include Strix Impact III');
    });

    it('ensures each product has real 2D artwork SVG file that physically exists', () => {
      mice.forEach((mouse) => {
        const imageMedia = mouse.media.find((m) => m.kind === 'image');
        assert.ok(imageMedia?.url, `Mouse ${mouse.name} must have an image url`);
        assert.ok(imageMedia.url.endsWith('.svg'), `Image ${imageMedia.url} should be 2D SVG vector`);
        const relativePath = 'public' + imageMedia.url;
        assert.ok(existsSync(relativePath), `Image file ${relativePath} must physically exist`);
      });
    });
  });

  describe('Strict 2D Image Display Contract (No 3D / WebGL)', () => {
    it('renders 2D Image component with pure 2D presentation without 3D canvas', () => {
      assert.match(mouseStorefront, /<Image/);
      assert.match(mouseStorefront, /className="mouse-product-image"/);
      assert.match(mouseStorefront, /className="mouse-product-art"/);
      assert.match(mouseCss, /aspect-ratio: 1 \/ 1/);
    });

    it('strictly forbids 3D Canvas, Three.js, WebGL or GLTF 3D model loaders in MouseStorefront', () => {
      assert.doesNotMatch(mouseStorefront, /<canvas/i, 'Must not use HTML5 canvas');
      assert.doesNotMatch(mouseStorefront, /three/i, 'Must not import Three.js');
      assert.doesNotMatch(mouseStorefront, /@react-three/i, 'Must not use React Three Fiber');
      assert.doesNotMatch(mouseStorefront, /GLTFLoader/i, 'Must not use GLTF loaders');
      assert.doesNotMatch(mouseStorefront, /webgl/i, 'Must not use WebGL context');
    });
  });

  describe('Interactive 2D Orbit Ring Physics & Carousel Controls', () => {
    it('implements momentum wheel, pointer drag, velocity damping, and auto-rotation', () => {
      assert.match(mouseStorefront, /requestAnimationFrame/);
      assert.match(mouseStorefront, /onWheel=\{handleWheel\}/);
      assert.match(mouseStorefront, /onPointerDown=\{handlePointerDown\}/);
      assert.match(mouseStorefront, /window\.addEventListener\('pointermove'/);
      assert.match(mouseStorefront, /window\.addEventListener\('pointerup'/);
      assert.match(mouseStorefront, /DRAG_RADIANS_PER_PIXEL/);
      assert.match(mouseStorefront, /INERTIA_DURATION_MS/);
      assert.match(mouseStorefront, /AUTO_ROTATION_MS/);
    });

    it('calculates orbital geometry and writes custom properties directly to DOM elements', () => {
      assert.match(mouseStorefront, /function orbitStyle/);
      assert.match(mouseStorefront, /--orbit-x-wide/);
      assert.match(mouseStorefront, /--orbit-y-wide/);
      assert.match(mouseStorefront, /--orbit-scale-wide/);
      assert.match(mouseStorefront, /--orbit-opacity/);
      assert.match(mouseStorefront, /--orbit-depth/);
      assert.match(mouseStorefront, /element\.style\.setProperty/);
    });

    it('provides wheel controls with range slider 0-359 and step navigation buttons', () => {
      assert.match(mouseStorefront, /className="mouse-wheel"/);
      assert.match(mouseStorefront, /className="mouse-wheel-button"/);
      assert.match(mouseStorefront, /className="mouse-wheel-slider"/);
      assert.match(mouseStorefront, /min="0"/);
      assert.match(mouseStorefront, /max="359"/);
      assert.match(mouseStorefront, /className="mouse-wheel-index"/);
    });
  });

  describe('Detail Drawer Panel & Cart Integration', () => {
    it('supports detail panel toggle with animated focus and keyboard accessibility', () => {
      assert.match(mouseStorefront, /className="mouse-detail-panel"/);
      assert.match(mouseStorefront, /className="mouse-detail-content"/);
      assert.match(mouseStorefront, /className="mouse-back-button"/);
      assert.match(mouseStorefront, /className="mouse-specifications"/);
      assert.match(mouseStorefront, /className="mouse-source-link"/);
      assert.match(mouseStorefront, /className="mouse-detail-navigation"/);
      assert.match(mouseStorefront, /event\.key === 'Escape'/);
    });

    it('integrates Add To Cart action with useCartStore and slide-over opening', () => {
      assert.match(mouseStorefront, /useCartStore\.getState\(\)\.addItem/);
      assert.match(mouseStorefront, /useCartStore\.getState\(\)\.openCart/);
      assert.match(mouseStorefront, /className="mouse-add-cart-btn"/);
    });
  });

  describe('Multi-Device Responsive Architecture & UI/UX Pro Max Compliance', () => {
    it('implements tiered media queries across mobile, tablet, laptop, and ultra-wide screens', () => {
      assert.match(mouseCss, /@media \(min-width: 1440px\)/, 'Must support ultra-wide monitors');
      assert.match(mouseCss, /@media \(min-width: 901px\) and \(max-width: 1199px\)/, 'Must support standard laptops');
      assert.match(mouseCss, /@media \(min-width: 641px\) and \(max-width: 900px\)/, 'Must support tablet portrait');
      assert.match(mouseCss, /@media \(max-width: 640px\)/, 'Must support compact mobile');
      assert.match(mouseCss, /@media \(max-height: 700px\)/, 'Must adapt for height-constrained laptops');
      assert.match(mouseCss, /@media \(max-height: 500px\) and \(orientation: landscape\)/, 'Must adapt for landscape mobile');
    });

    it('adheres to touch interaction and safe area insets guidelines', () => {
      assert.match(mouseCss, /env\(safe-area-inset-bottom\)/, 'Must respect bottom safe area on mobile');
      assert.match(mouseCss, /env\(safe-area-inset-top\)/, 'Must respect top safe area on mobile');
      assert.match(mouseCss, /overscroll-behavior: contain/, 'Must contain overscroll on viewport');
      assert.match(mouseCss, /touch-action: pan-y/, 'Must declare touch-action pan-y for gesture safety');
    });

    it('compacts mobile copy into 2-column active badge to prevent orbital overlap', () => {
      assert.match(mouseCss, /grid-template-columns: minmax\(0, 1fr\) auto/);
      assert.match(mouseCss, /clamp\(440px, calc\(100svh - 78px\), 1080px\)/);
    });

    it('strictly anchors orbit center to the right (82%) and forbids centering ellipse to 50vw on small viewports', () => {
      // Must not center the ellipse at 50vw in storefront rules
      assert.doesNotMatch(mouseCss, /--orbit-center-x:\s*50vw/, 'Orbit center must never be 50vw');
      assert.doesNotMatch(globalsCss, /\.mouse-storefront[\s\S]*?--orbit-center-x:\s*50vw/, 'globals.css mouse-storefront must not set 50vw');
      assert.match(mouseCss, /--orbit-center-x:\s*82%/, 'Orbit center must be anchored at 82% on small screens');
      // Proximity distance formula in MouseStorefront.tsx must match focus angle
      assert.match(mouseStorefront, /const mobileDistance = Math\.hypot\(cosine \+ 0\.45, sine \+ 0\.8\)/);
    });

    it('shifts desktop orbit center 15% to the left (90vw) and expands circular orbit to 76.8vw (38.4vw radius)', () => {
      assert.match(mouseCss, /--orbit-center-x:\s*90vw/, 'Desktop orbit center must be 90vw');
      assert.match(mouseCss, /--orbit-center-y:\s*95%/, 'Desktop orbit center must be 95%');
      assert.match(globalsCss, /\.mouse-storefront[\s\S]*?--orbit-center-x:\s*90vw/, 'globals.css must include 90vw');
      assert.match(globalsCss, /\.mouse-storefront[\s\S]*?--orbit-center-y:\s*95%/, 'globals.css must include 95%');
      assert.match(mouseCss, /width:\s*76\.8vw/, 'Circle width must be 76.8vw');
      assert.match(mouseCss, /height:\s*76\.8vw/, 'Circle height must be 76.8vw');
      assert.match(mouseCss, /aspect-ratio:\s*1\s*\/\s*1/, 'Circle track must have aspect-ratio 1 / 1');
      assert.match(mouseStorefront, /--orbit-x-wide':\s*\(cosine\s*\*\s*38\.4\)/, 'Wide X radius must be 38.4vw');
      assert.match(mouseStorefront, /--orbit-y-wide':\s*\(sine\s*\*\s*38\.4\)/, 'Wide Y radius must be 38.4vw');
    });

    it('maximizes zoom scale at closest position to page center and decreases scale further away', () => {
      // Must target the point on circular orbit closest to viewport center (50vw, 50vh)
      assert.match(
        mouseStorefront,
        /const wideDistance = Math\.hypot\(cosine \+ 0\.843, sine \+ 0\.537\)/,
        'Wide zoom distance formula must target focus vector closest to page center',
      );
      assert.match(
        mouseStorefront,
        /ORBIT_FOCUS_ANGLE = Math\.atan2\(-0\.537, -0\.843\)/,
        'Orbit focus angle must align with page center closest point',
      );
    });
  });

  describe('Bot Chat Collision Avoidance & Topmost Z-Index Layering', () => {
    it('ensures popup bot chat is always the topmost layer with z-[1000]', () => {
      assert.match(
        chatWidget,
        /isOpen\s*\?\s*['"]z-\[1000\]['"]\s*:\s*['"]z-\[60\]['"]/,
        'ChatWidget container must use z-[1000] when open and z-[60] when closed',
      );
    });

    it('positions orbit wheel centered at viewport bottom to completely avoid overlapping with bot chat', () => {
      assert.match(
        mouseCss,
        /\.mouse-wheel\s*\{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)[^}]*right:\s*auto/,
        'mouse.css .mouse-wheel must be centered horizontally with left: 50% and right: auto',
      );
      assert.match(
        globalsCss,
        /\.mouse-wheel\s*\{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)[^}]*right:\s*auto/,
        'globals.css .mouse-wheel must be centered horizontally with left: 50% and right: auto',
      );
      assert.doesNotMatch(
        mouseCss,
        /\.mouse-wheel\s*\{[^}]*z-index:\s*50/,
        'mouse-wheel z-index must not be 50 to avoid covering interactive floating widgets',
      );
    });

    it('provides vertical clearance for mobile viewports to prevent collision with mobile chat launcher', () => {
      assert.match(
        mouseCss,
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.mouse-wheel\s*\{[\s\S]*?bottom:\s*max\(72px/,
        'Mobile mouse-wheel must sit at least 72px from bottom to clear mobile chat launcher',
      );
      assert.match(
        globalsCss,
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.mouse-wheel\s*\{[\s\S]*?bottom:\s*max\(72px/,
        'globals.css mobile mouse-wheel must sit at least 72px from bottom to clear mobile chat launcher',
      );
    });
  });

  describe('Strict Em Dash Ban (U+2014) Compliance', () => {
    it('guarantees zero em dash characters across all new mouse storefront files', () => {
      assert.doesNotMatch(mousePage, /\u2014/, 'mouse/page.tsx must not contain em dash');
      assert.doesNotMatch(mouseStorefront, /\u2014/, 'MouseStorefront.tsx must not contain em dash');
      assert.doesNotMatch(mouseCss, /\u2014/, 'mouse.css must not contain em dash');
      assert.doesNotMatch(globalsCss, /\u2014/, 'globals.css must not contain em dash');
      assert.doesNotMatch(mouseAdapter, /\u2014/, 'mouse-adapter.ts must not contain em dash');
      assert.doesNotMatch(miceData, /\u2014/, 'mice.ts must not contain em dash');
    });
  });
});
