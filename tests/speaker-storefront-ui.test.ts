import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { PRODUCT_RECORDS } from '../src/lib/catalog/sample-data.ts';

const speakerPage = readFileSync('src/app/speaker/page.tsx', 'utf8');
const speakerStorefront = readFileSync('src/components/ui/SpeakerStorefront.tsx', 'utf8');
const speakerCss = readFileSync('src/app/speaker/speaker.css', 'utf8');
const categoryPage = readFileSync('src/app/[category]/page.tsx', 'utf8');
const globalsCss = readFileSync('src/app/globals.css', 'utf8');
const speakerAdapter = readFileSync('src/lib/catalog/speaker-adapter.ts', 'utf8');
const speakersData = readFileSync('src/data/speakers.ts', 'utf8');
const chatWidget = readFileSync('src/components/chat/ChatWidget.tsx', 'utf8');
const nextConfig = readFileSync('next.config.ts', 'utf8');

describe('Speaker Storefront Architecture & Acoustic Waveform & Desk Stage UI (Hướng 1)', () => {
  describe('Routing & Page Shell Contracts', () => {
    it('serves dedicated /speaker route with Suspense streaming fallback', () => {
      assert.ok(existsSync('src/app/speaker/page.tsx'), 'speaker/page.tsx must exist');
      assert.match(speakerPage, /export default function SpeakerPage/);
      assert.match(speakerPage, /<Suspense/);
      assert.match(speakerPage, /listProductsByCategory\('speaker'\)/);
      assert.match(speakerPage, /toSpeakerProducts/);
      assert.match(speakerPage, /<SpeakerStorefront/);
    });

    it('excludes speaker from dynamic [category] static generation to prioritize bespoke showcase', () => {
      assert.match(categoryPage, /category\.id !== 'speaker'/);
      assert.match(categoryPage, /category\.id !== 'monitor'/);
      assert.match(categoryPage, /category\.id !== 'keyboard'/);
      assert.match(categoryPage, /category\.id !== 'mouse'/);
    });
  });

  describe('Speaker Catalogue Data & 6 Authentic Sample Products', () => {
    const speakers = PRODUCT_RECORDS.filter((p) => p.categoryId === 'speaker');

    it('contains at least 6 speaker products in sample catalogue for rich showcase', () => {
      assert.ok(speakers.length >= 6, `Expected at least 6 speakers, found ${speakers.length}`);
    });

    it('includes authentic desktop audio lineup across Bookshelf pairs and Gaming Soundbars', () => {
      const names = speakers.map((s) => s.name);
      assert.ok(names.some((n) => n.includes('Cetra')), 'Should include ROG Cetra');
      assert.ok(names.some((n) => n.includes('Strix Soundbar')), 'Should include ROG Strix Soundbar');
      assert.ok(names.some((n) => n.includes('S880DB')), 'Should include Edifier S880DB');
      assert.ok(names.some((n) => n.includes('Compact')), 'Should include HGK Soundbar Compact');
      assert.ok(names.some((n) => n.includes('Audioengine A2+')), 'Should include Audioengine A2+');
      assert.ok(names.some((n) => n.includes('Leviathan')), 'Should include Razer Leviathan V2 X');
    });

    it('ensures each speaker has a real 2D artwork SVG file that physically exists', () => {
      speakers.forEach((speaker) => {
        const imageMedia = speaker.media.find((m) => m.kind === 'image');
        assert.ok(imageMedia?.url, `Speaker ${speaker.name} must have an image url`);
        assert.ok(imageMedia.url.endsWith('.svg'), `Image ${imageMedia.url} should be 2D SVG vector`);
        const relativePath = 'public' + imageMedia.url;
        assert.ok(existsSync(relativePath), `Image file ${relativePath} must physically exist`);
      });
    });
  });

  describe('Strict 2D Image Display Contract (No 3D / WebGL)', () => {
    it('renders 2D Image component with pure 2D presentation without 3D canvas', () => {
      assert.match(speakerStorefront, /<Image/);
      assert.match(speakerStorefront, /className="speaker-product-image"/);
      assert.match(speakerStorefront, /className=.*speaker-product-art/);
      assert.match(speakerStorefront, /unoptimized/);
      assert.match(speakerCss, /aspect-ratio:\s*1\s*\/\s*1/);
    });

    it('safeguards remote Supabase product images and SVG assets in next.config.ts', () => {
      assert.match(nextConfig, /remotePatterns:\s*\[[\s\S]*hostname:\s*['"]\*\*\.supabase\.co['"]/);
      assert.match(nextConfig, /dangerouslyAllowSVG:\s*true/);
    });

    it('strictly forbids 3D Canvas, Three.js, WebGL or GLTF 3D model loaders in SpeakerStorefront', () => {
      assert.doesNotMatch(speakerStorefront, /<canvas/i, 'Must not use HTML5 canvas in SpeakerStorefront');
      assert.doesNotMatch(speakerStorefront, /three/i, 'Must not import Three.js');
      assert.doesNotMatch(speakerStorefront, /@react-three/i, 'Must not use React Three Fiber');
      assert.doesNotMatch(speakerStorefront, /GLTFLoader/i, 'Must not use GLTF loaders');
      assert.doesNotMatch(speakerStorefront, /webgl/i, 'Must not use WebGL context');
    });
  });

  describe('Acoustic Spectrum Waveform Visualizer & Desk Stage Area', () => {
    it('renders dynamic multi-band frequency spectrum waveform with harmonic simulation and valid React SVG attributes', () => {
      assert.match(speakerStorefront, /className="speaker-waveform-container"/);
      assert.match(speakerStorefront, /className="speaker-waveform-svg speaker-waveform-glow"/);
      assert.match(speakerStorefront, /className="speaker-waveform-bar"/);
      assert.match(speakerStorefront, /stopColor=/);
      assert.match(speakerStorefront, /stopOpacity=/);
      assert.doesNotMatch(speakerStorefront, /stop-color=/);
      assert.doesNotMatch(speakerStorefront, /stop-opacity=/);
      assert.match(speakerStorefront, /requestAnimationFrame/);
    });

    it('implements tactile woofer bass pulse excursion animation', () => {
      assert.match(speakerStorefront, /speaker-woofer-pulse/);
      assert.match(speakerCss, /@keyframes speaker-bass-pulse/);
      assert.match(speakerCss, /speaker-woofer-pulse/);
    });

    it('renders realistic desk surface reflection and acoustic isolation stage', () => {
      assert.match(speakerStorefront, /className="speaker-desk-surface"/);
      assert.match(speakerStorefront, /className="speaker-desk-reflection"/);
      assert.match(speakerCss, /\.speaker-desk-surface/);
      assert.match(speakerCss, /\.speaker-desk-reflection/);
    });

    it('provides sound profile switcher pills for Hi-Fi Studio, Bass Boost Gaming, and Vocal Acoustic', () => {
      assert.match(speakerStorefront, /className="speaker-profile-container"/);
      assert.match(speakerStorefront, /className="speaker-profile-btn"/);
      assert.match(speakerStorefront, /Hi-Fi Studio/);
      assert.match(speakerStorefront, /Bass Boost Gaming/);
      assert.match(speakerStorefront, /Vocal Acoustic/);
    });
  });

  describe('Mechanical Rotary Volume Knob & Center Stage Controls', () => {
    it('provides tactile rotary dial with pointer drag, wheel scroll, and range slider', () => {
      assert.match(speakerStorefront, /className="speaker-volume-dial"/);
      assert.match(speakerStorefront, /onPointerDown=\{handleDialPointerDown\}/);
      assert.match(speakerStorefront, /onPointerMove=\{handleDialPointerMove\}/);
      assert.match(speakerStorefront, /onWheel=\{handleDialWheel\}/);
      assert.match(speakerStorefront, /className="speaker-volume-slider"/);
      assert.match(speakerStorefront, /className="speaker-volume-readout"/);
    });

    it('provides step navigation buttons to switch between speakers', () => {
      assert.match(speakerStorefront, /className="speaker-step-button"/);
      assert.match(speakerStorefront, /onClick=\{\(\) => stepSpeaker\(-1\)\}/);
      assert.match(speakerStorefront, /onClick=\{\(\) => stepSpeaker\(1\)\}/);
      assert.match(speakerStorefront, /className="speaker-index-badge"/);
    });

    it('supports keyboard navigation via arrow keys and escape', () => {
      assert.match(speakerStorefront, /event\.key === 'ArrowLeft'/);
      assert.match(speakerStorefront, /event\.key === 'ArrowRight'/);
      assert.match(speakerStorefront, /event\.key === 'ArrowUp'/);
      assert.match(speakerStorefront, /event\.key === 'ArrowDown'/);
      assert.match(speakerStorefront, /event\.key === 'Escape'/);
    });
  });

  describe('Detail Drawer Panel & Cart Integration', () => {
    it('supports detail panel toggle with animated focus and acoustic specifications', () => {
      assert.match(speakerStorefront, /className="speaker-detail-panel"/);
      assert.match(speakerStorefront, /className="speaker-detail-content"/);
      assert.match(speakerStorefront, /className="speaker-back-button"/);
      assert.match(speakerStorefront, /className="speaker-specifications"/);
      assert.match(speakerStorefront, /className="speaker-source-link"/);
      assert.match(speakerStorefront, /className="speaker-detail-navigation"/);
    });

    it('integrates Add To Cart action with useCartStore and opens cart drawer', () => {
      assert.match(speakerStorefront, /useCartStore\.getState\(\)\.addItem/);
      assert.match(speakerStorefront, /useCartStore\.getState\(\)\.openCart/);
      assert.match(speakerStorefront, /className="speaker-add-cart-btn"/);
    });
  });

  describe('Multi-Device Responsive Architecture & Bot Chat Clearance', () => {
    it('implements tiered media queries across mobile, tablet, laptop, and ultra-wide screens', () => {
      assert.match(speakerCss, /@media \(min-width: 1440px\)/, 'Must support ultra-wide monitors');
      assert.match(speakerCss, /@media \(min-width: 901px\) and \(max-width: 1199px\)/, 'Must support laptops');
      assert.match(speakerCss, /@media \(min-width: 641px\) and \(max-width: 900px\)/, 'Must support tablet portrait');
      assert.match(speakerCss, /@media \(max-width: 640px\)/, 'Must support compact mobile');
      assert.match(speakerCss, /@media \(max-height: 700px\)/, 'Must adapt for height-constrained screens');
      assert.match(speakerCss, /@media \(max-height: 500px\) and \(orientation: landscape\)/, 'Must adapt for landscape mobile');
    });

    it('adheres to touch interaction and safe area insets guidelines', () => {
      assert.match(speakerCss, /env\(safe-area-inset-bottom\)/, 'Must respect bottom safe area on mobile');
      assert.match(speakerCss, /env\(safe-area-inset-top\)/, 'Must respect top safe area on mobile');
      assert.match(speakerCss, /overscroll-behavior: contain/, 'Must contain overscroll on viewport');
      assert.match(speakerCss, /touch-action: pan-y/, 'Must declare touch-action pan-y');
    });

    it('ensures popup bot chat is always topmost layer with z-[1000]', () => {
      assert.match(
        chatWidget,
        /isOpen\s*\?\s*['"]z-\[1000\]['"]\s*:\s*['"]z-\[60\]['"]/,
        'ChatWidget must use z-[1000] when open and z-[60] when closed',
      );
    });

    it('positions volume control centered at viewport bottom to completely avoid overlapping with bot chat', () => {
      assert.match(
        speakerCss,
        /\.speaker-volume-control\s*\{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)[^}]*right:\s*auto/,
        'speaker.css .speaker-volume-control must be centered horizontally with left: 50% and right: auto',
      );
      assert.match(
        globalsCss,
        /\.speaker-volume-control\s*\{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)[^}]*right:\s*auto/,
        'globals.css .speaker-volume-control must be centered horizontally with left: 50% and right: auto',
      );
    });

    it('provides vertical clearance on mobile viewports to prevent collision with mobile chat launcher', () => {
      assert.match(
        speakerCss,
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.speaker-volume-control\s*\{[\s\S]*?bottom:\s*max\(72px/,
        'Mobile speaker-volume-control must sit at least 72px from bottom',
      );
      assert.match(
        globalsCss,
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.speaker-volume-control\s*\{[\s\S]*?bottom:\s*max\(72px/,
        'globals.css mobile speaker-volume-control must sit at least 72px from bottom',
      );
    });
  });

  describe('Site-Wide White Background Theme & Tactile UI Synchronization', () => {
    it('guarantees white background as default theme with tactile styling in speaker storefront', () => {
      assert.match(
        speakerCss,
        /\.speaker-storefront\s*\{[^}]*background:\s*var\(--page,\s*#ffffff\)/,
        'speaker.css must use white background var(--page, #ffffff)',
      );
      assert.match(
        globalsCss,
        /\.speaker-storefront\s*\{[^}]*background:\s*var\(--page,\s*#ffffff\)/,
        'globals.css must use white background var(--page, #ffffff)',
      );
      assert.match(
        speakerCss,
        /\.speaker-storefront\s*\{[^}]*color:\s*var\(--ink,\s*#171717\)/,
        'speaker.css must use dark ink text var(--ink, #171717)',
      );
    });

    it('uses high-contrast refined acoustic waveform gradient and desk surface on white background', () => {
      assert.match(speakerStorefront, /stopColor="#0284c7"/, 'Waveform should use Sky Blue #0284c7 for high contrast');
      assert.match(speakerStorefront, /stopColor="#4f46e5"/, 'Waveform should use Indigo #4f46e5');
      assert.match(speakerStorefront, /stopColor="#be123c"/, 'Waveform should use Accent #be123c');
      assert.match(speakerCss, /\.speaker-desk-surface\s*\{[^}]*rgba\(241,\s*245,\s*249/);
    });
  });

  describe('Strict Em Dash Ban (U+2014) Compliance', () => {
    it('guarantees zero em dash characters across all speaker storefront files', () => {
      assert.doesNotMatch(speakerPage, /\u2014/, 'speaker/page.tsx must not contain em dash');
      assert.doesNotMatch(speakerStorefront, /\u2014/, 'SpeakerStorefront.tsx must not contain em dash');
      assert.doesNotMatch(speakerCss, /\u2014/, 'speaker.css must not contain em dash');
      assert.doesNotMatch(globalsCss, /\u2014/, 'globals.css must not contain em dash');
      assert.doesNotMatch(speakerAdapter, /\u2014/, 'speaker-adapter.ts must not contain em dash');
      assert.doesNotMatch(speakersData, /\u2014/, 'speakers.ts must not contain em dash');
      assert.doesNotMatch(nextConfig, /\u2014/, 'next.config.ts must not contain em dash');
    });
  });
});
