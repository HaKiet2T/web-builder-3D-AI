import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const homePage = readFileSync('src/app/page.tsx', 'utf8');
const rootLayout = readFileSync('src/app/layout.tsx', 'utf8');
const globalsCss = readFileSync('src/app/globals.css', 'utf8');
const kineticMarquee = readFileSync('src/components/ui/KineticMarquee.tsx', 'utf8');
const filmGrain = readFileSync('src/components/ui/FilmGrain.tsx', 'utf8');
const tactileFeedback = readFileSync('src/components/ui/TactileFeedback.tsx', 'utf8');

describe('Kinetic Typography and Tactile Brutalism Architecture (Step 3)', () => {
  it('exports KineticMarquee component driven by GSAP animation and scroll velocity', () => {
    assert.match(kineticMarquee, /import gsap from 'gsap'/);
    assert.match(kineticMarquee, /export function KineticMarquee/);
    assert.match(kineticMarquee, /role="region"/);
    assert.match(kineticMarquee, /aria-label=/);
    assert.match(kineticMarquee, /prefers-reduced-motion/);
    assert.match(kineticMarquee, /window\.addEventListener\('scroll', handleScroll/);
    assert.match(kineticMarquee, /timeScale/);
  });

  it('provides comprehensive flagship tech specs in DEFAULT_TECH_SPECS', () => {
    assert.match(kineticMarquee, /OLED 240Hz/);
    assert.match(kineticMarquee, /0\.03ms GTG/);
    assert.match(kineticMarquee, /4K UHD QUANTUM DOT/);
    assert.match(kineticMarquee, /DCI-P3 99% CINEMATIC/);
    assert.match(kineticMarquee, /CNC ANODIZED ALUMINUM/);
    assert.match(kineticMarquee, /WIRELESS 8000Hz POLLING/);
    assert.match(kineticMarquee, /RAPID TRIGGER 0\.1mm/);
    assert.match(kineticMarquee, /HOT-SWAPPABLE GASKET/);
  });

  it('renders FilmGrain material overlay inside RootLayout', () => {
    assert.match(rootLayout, /import \{ FilmGrain \} from "@\/components\/ui\/FilmGrain"/);
    assert.match(rootLayout, /<FilmGrain \/>/);
    assert.match(filmGrain, /tactile-grain-overlay/);
  });

  it('implements hardware-accelerated film grain in globals.css with pointer-events none', () => {
    assert.match(globalsCss, /\.tactile-grain-overlay\s*\{[^}]*pointer-events:\s*none/);
    assert.match(globalsCss, /\.tactile-grain-overlay\s*\{[^}]*transform:\s*translateZ\(0\)/);
    assert.match(globalsCss, /\.tactile-grain-overlay\s*\{[^}]*feTurbulence/);
  });

  it('composes KineticMarquee into HomePage seamlessly between SetupCarousel and CategoryShowcase', () => {
    assert.match(homePage, /import \{ KineticMarquee \} from '@\/components\/ui\/KineticMarquee'/);
    assert.match(homePage, /<KineticMarquee \/>/);

    const heroIdx = homePage.indexOf('<HomeHeroBanner');
    const setupIdx = homePage.indexOf('<SetupCarousel');
    const marqueeIdx = homePage.indexOf('<KineticMarquee');
    const categoryIdx = homePage.indexOf('<CategoryShowcase');

    assert.ok(heroIdx > -1, 'HomeHeroBanner must be present');
    assert.ok(setupIdx > heroIdx, 'SetupCarousel must follow HomeHeroBanner');
    assert.ok(marqueeIdx > setupIdx, 'KineticMarquee must follow SetupCarousel');
    assert.ok(categoryIdx > marqueeIdx, 'CategoryShowcase must follow KineticMarquee');
  });

  it('maintains White-First default theme while providing Tactile Brutalism 1px hairline borders', () => {
    assert.match(globalsCss, /:root\s*\{[^}]*--page:\s*#ffffff/);
    assert.match(globalsCss, /\.kinetic-marquee-section\s*\{[^}]*border-top:\s*1px solid var\(--line\)/);
    assert.match(globalsCss, /\.kinetic-marquee-section\s*\{[^}]*border-bottom:\s*1px solid var\(--line\)/);
    assert.match(globalsCss, /\.button-primary:active,\s*\.button-secondary:active,\s*\.product-card:active/);
  });

  it('provides TactileCard with micro-tilt and cursor reflection feedback', () => {
    assert.match(tactileFeedback, /export function TactileCard/);
    assert.match(tactileFeedback, /perspective\(1000px\)/);
    assert.match(tactileFeedback, /rotateX/);
    assert.match(tactileFeedback, /rotateY/);
    assert.match(tactileFeedback, /tactile-cursor-reflection/);
    assert.match(tactileFeedback, /export function TactileBadge/);
  });
});
