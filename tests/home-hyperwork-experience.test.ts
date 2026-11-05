import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { describe, it } from 'node:test';

const homePage = readFileSync('src/app/page.tsx', 'utf8');
const heroBanner = readFileSync('src/components/home/HomeHeroBanner.tsx', 'utf8');
const setupCarousel = readFileSync('src/components/home/SetupCarousel.tsx', 'utf8');
const mauSetupPage = readFileSync('src/app/mau-setup/page.tsx', 'utf8');
const topProductsPage = readFileSync('src/app/top-san-pham/page.tsx', 'utf8');
const spaceDetailPage = readFileSync('src/app/khong-gian/[slug]/page.tsx', 'utf8');

describe('HyperWork inspired home page and destination routes', () => {
  it('hero 1 links to /mau-setup and uses hero-1.png', () => {
    assert.match(heroBanner, /href="\/mau-setup"/);
    assert.match(heroBanner, /src="\/home\/hero-1\.png"/);
    assert.match(heroBanner, /hero-primary-card/);
  });

  it('hero 2 and hero 3 link to /top-san-pham with hero-2.png and hero-3.png', () => {
    const hero2Matches = heroBanner.match(/href="\/top-san-pham"/g);
    assert.ok(hero2Matches && hero2Matches.length >= 2, 'Hero 2 and 3 must both link to /top-san-pham');
    assert.match(heroBanner, /src="\/home\/hero-2\.png"/);
    assert.match(heroBanner, /src="\/home\/hero-3\.png"/);
  });

  it('setup inspiration carousel contains 3 draggable spaces linking to their own pages', () => {
    assert.match(setupCarousel, /goc-lam-viec-toi-gian/);
    assert.match(setupCarousel, /goc-podcast/);
    assert.match(setupCarousel, /van-phong-hien-dai/);
    assert.match(setupCarousel, /\/home\/setup-goc-lam-viec-toi-gian\.png/);
    assert.match(setupCarousel, /\/home\/setup-goc-podcast-sang-tao\.png/);
    assert.match(setupCarousel, /\/home\/setup-van-phong-xanh-mat\.png/);
    assert.match(setupCarousel, /onMouseDown=\{handleMouseDown\}/);
    assert.match(setupCarousel, /onMouseMove=\{handleMouseMove\}/);
  });

  it('home page composes the full HyperWork showcase layout', () => {
    assert.match(homePage, /<HomeHeroBanner/);
    assert.match(homePage, /<CategoryShowcase/);
    assert.match(homePage, /<FeaturedProductsSection/);
    assert.match(homePage, /<SetupCarousel/);
    assert.match(homePage, /<BrandFeatures/);
    assert.match(homePage, /<NewsletterSection/);
    assert.match(homePage, /<Suspense[\s\S]*<HomeLoading/);
  });

  it('verifies all 6 required images exist in public/home/', () => {
    assert.ok(existsSync('public/home/hero-1.png'), 'hero-1.png must exist');
    assert.ok(existsSync('public/home/hero-2.png'), 'hero-2.png must exist');
    assert.ok(existsSync('public/home/hero-3.png'), 'hero-3.png must exist');
    assert.ok(existsSync('public/home/setup-goc-lam-viec-toi-gian.png'), 'setup-goc-lam-viec-toi-gian.png must exist');
    assert.ok(existsSync('public/home/setup-goc-podcast-sang-tao.png'), 'setup-goc-podcast-sang-tao.png must exist');
    assert.ok(existsSync('public/home/setup-van-phong-xanh-mat.png'), 'setup-van-phong-xanh-mat.png must exist');
  });

  it('verifies static params and prerender contracts for destination routes', () => {
    assert.match(mauSetupPage, /export default function MauSetupPage/);
    assert.match(topProductsPage, /export default function TopProductsPage/);
    assert.match(spaceDetailPage, /export function generateStaticParams/);
  });
});
