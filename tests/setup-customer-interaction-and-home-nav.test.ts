import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const setupPageTsx = readFileSync('src/app/setup/page.tsx', 'utf8');
const roomViewerTsx = readFileSync('src/components/room/RoomViewer.tsx', 'utf8');
const roomViewerCss = readFileSync('src/components/room/room-viewer.css', 'utf8');
const homePageTsx = readFileSync('src/app/page.tsx', 'utf8');
const siteHeaderTsx = readFileSync('src/components/layout/SiteHeader.tsx', 'utf8');
const heroBannerTsx = readFileSync('src/components/home/HomeHeroBanner.tsx', 'utf8');
const setupCarouselTsx = readFileSync('src/components/home/SetupCarousel.tsx', 'utf8');
const setupCtaBannerTsx = readFileSync('src/components/home/SetupCtaBanner.tsx', 'utf8');
const catalogSampleDataTs = readFileSync('src/lib/catalog/sample-data.ts', 'utf8');

describe('Room Setup Customer Interaction & Home Navigation', () => {
  describe('Dedicated /setup Route Architecture', () => {
    it('creates first-class /setup page with dynamic room resolution and RoomViewer', () => {
      assert.match(setupPageTsx, /import\s*\{\s*RoomViewer\s*\}\s*from\s*'@\/components\/room\/RoomViewer'/);
      assert.match(setupPageTsx, /import\s*\{[^}]*listPublishedRoomSetups[^}]*\}\s*from\s*'@\/lib\/room\/dal'/);
      assert.match(setupPageTsx, /const\s+setups\s*=\s*await\s+listPublishedRoomSetups\(\)/);
      assert.match(setupPageTsx, /const\s+currentSetup\s*=\s*\(await\s+getRoomSetupBySlug/);
      assert.match(setupPageTsx, /<RoomViewer\s+setup=\{currentSetup\}\s*\/>/);
    });

    it('renders room switcher tabs allowing customers to switch setups seamlessly', () => {
      assert.match(setupPageTsx, /setup-studio-tabs-bar/);
      assert.match(setupPageTsx, /setup-studio-pill/);
      assert.match(setupPageTsx, /href=\{`\/setup\?space=\$\{s\.slug\}`\}/);
      assert.match(roomViewerCss, /\.setup-studio-tabs-bar/);
      assert.match(roomViewerCss, /\.setup-studio-pill/);
      assert.match(roomViewerCss, /\.setup-studio-pill--active/);
    });

    it('implements structured SEO metadata and JSON-LD for /setup page', () => {
      assert.match(setupPageTsx, /generateMetadata/);
      assert.match(setupPageTsx, /generateRoomSetupJsonLd/);
      assert.match(setupPageTsx, /application\/ld\+json/);
    });
  });

  describe('Customer Interactive Mode in RoomViewer', () => {
    it('manages local currentItems state and viewerMode for customer customization', () => {
      assert.match(roomViewerTsx, /const\s+\[currentItems,\s*setCurrentItems\]\s*=\s*useState<RoomItem\[\]>/);
      assert.match(roomViewerTsx, /const\s+\[viewerMode,\s*setViewerMode\]\s*=\s*useState<'view'\s*\|\s*'edit'>\('view'\)/);
      assert.match(roomViewerTsx, /const\s+\[hasCustomized,\s*setHasCustomized\]\s*=\s*useState<boolean>\(false\)/);
    });

    it('renders mode switcher pills for "Khám phá & Mua sắm" vs "Tự tay sắp xếp góc máy"', () => {
      assert.match(roomViewerTsx, /room-viewer-mode-bar/);
      assert.match(roomViewerTsx, /room-mode-pill-group/);
      assert.match(roomViewerTsx, /room-mode-pill/);
      assert.match(roomViewerTsx, /Tự tay sắp xếp góc máy/);
      assert.match(roomViewerTsx, /Khám phá &amp; Mua sắm/);
      assert.match(roomViewerCss, /\.room-viewer-mode-bar/);
      assert.match(roomViewerCss, /\.room-mode-pill/);
      assert.match(roomViewerCss, /\.room-mode-pill--active/);
    });

    it('provides reset layout button when customer customizes their setup', () => {
      assert.match(roomViewerTsx, /handleResetLayout/);
      assert.match(roomViewerTsx, /room-reset-layout-btn/);
      assert.match(roomViewerTsx, /Khôi phục vị trí mặc định/);
      assert.match(roomViewerCss, /\.room-reset-layout-btn/);
    });

    it('passes customer item updates to RoomStage and dynamically syncs product count', () => {
      assert.match(roomViewerTsx, /onUpdateItem=\{handleUpdateItem\}/);
      assert.match(roomViewerTsx, /onDeleteItem=\{handleDeleteItem\}/);
      assert.match(roomViewerTsx, /items=\{currentItems\}/);
      assert.match(roomViewerTsx, /mode=\{viewerMode\}/);
    });
  });

  describe('Home Page Navigation to Setup Room', () => {
    it('includes "Góc Setup" with Studio 3D badge in SiteHeader navigation', () => {
      assert.match(siteHeaderTsx, /href="\/setup"/);
      assert.match(siteHeaderTsx, /Góc Setup/);
      assert.match(siteHeaderTsx, /Studio 3D/);
    });

    it('provides Setup Studio CTA in Hero 1 banner', () => {
      assert.match(heroBannerTsx, /href="\/mau-setup"/);
      assert.match(heroBannerTsx, /Trải nghiệm Setup Studio 3D/);
    });

    it('makes SetupCarousel header visible and provides Setup Studio button', () => {
      assert.doesNotMatch(setupCarouselTsx, /setup-carousel-header sr-only/);
      assert.match(setupCarouselTsx, /setup-carousel-header home-container/);
      assert.match(setupCarouselTsx, /href="\/setup"/);
      assert.match(setupCarouselTsx, /setup-carousel-header-btn/);
    });

    it('integrates dedicated SetupCtaBanner component on home page', () => {
      assert.match(homePageTsx, /import\s*\{\s*SetupCtaBanner\s*\}\s*from\s*'@\/components\/home\/SetupCtaBanner'/);
      assert.match(homePageTsx, /<SetupCtaBanner\s*\/>/);
      assert.match(setupCtaBannerTsx, /href="\/setup"/);
      assert.match(setupCtaBannerTsx, /Bắt đầu tự phối góc setup ngay/);
    });
  });

  describe('Asset Integrity & Zero Em Dash Guard', () => {
    it('provides valid SVG vector assets for keyboards and decor items', () => {
      assert.equal(existsSync('public/products/keyboard/rog-azoth.svg'), true);
      assert.equal(existsSync('public/products/keyboard/keychron-q1-pro.svg'), true);
      assert.equal(existsSync('public/decor/plant-succulent.svg'), true);
      assert.equal(existsSync('public/decor/coffee-cup.svg'), true);
      assert.equal(existsSync('public/decor/microphone-arm.svg'), true);
      assert.equal(existsSync('public/decor/desk-lamp.svg'), true);
    });

    it('assigns keyboard product media to valid SVG paths in catalog sample data', () => {
      assert.match(catalogSampleDataTs, /image:\s*'\/products\/keyboard\/rog-azoth\.svg'/);
      assert.match(catalogSampleDataTs, /image:\s*'\/products\/keyboard\/keychron-q1-pro\.svg'/);
    });

    it('strictly forbids em dash (U+2014) across all touched files', () => {
      const files = [
        setupPageTsx,
        roomViewerTsx,
        homePageTsx,
        siteHeaderTsx,
        heroBannerTsx,
        setupCarouselTsx,
        setupCtaBannerTsx,
      ];
      for (const content of files) {
        assert.doesNotMatch(content, /\u2014/, 'File contains forbidden em dash character');
      }
    });
  });
});
