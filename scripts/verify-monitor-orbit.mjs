import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const componentPath = new URL('../src/components/ui/MonitorStorefront.tsx', import.meta.url);
const stylesPath = new URL('../src/app/globals.css', import.meta.url);

const [component, styles] = await Promise.all([
  readFile(componentPath, 'utf8'),
  readFile(stylesPath, 'utf8'),
]);

console.log(`Checking monitor orbit interaction contracts in ${repositoryRoot}`);

assert.doesNotMatch(
  component,
  /['"]--detail-[xy]-(?:wide|mobile)['"]\s*:\s*\([^\n]*(?:sine|cosine)/,
  'The detail destination must be fixed, not derived from the current orbit angle.',
);

assert.match(
  component,
  /startRotation:\s*rotationRef\.current/,
  'Pointer drag must retain a stable rotation origin so movement maps directly to the cursor.',
);

assert.match(
  component,
  /DRAG_RADIANS_PER_PIXEL = 0\.003[\s\S]*?drag\.startRotation\s*\+\s*dragDistance\s*\*\s*DRAG_RADIANS_PER_PIXEL/,
  'Pointer drag must use a reduced, consistent sensitivity from its horizontal distance.',
);

assert.match(
  component,
  /INERTIA_DURATION_MS = 420[\s\S]*?MAX_INERTIA_RADIANS = 0\.5[\s\S]*?const easedProgress = 1 - Math\.pow\(1 - progress, 3\)/,
  'A quick, capped ease-out must carry the orbit briefly after a swipe.',
);

assert.match(
  component,
  /<Image[\s\S]*?draggable=\{false\}/,
  'Product images must disable native image dragging so pointer tracking is not cancelled.',
);

assert.match(
  component,
  /onClick=\{\(event\) => openDetails\(product, event\.currentTarget\)\}/,
  'Clicking a product image must continue to open the corresponding details.',
);

assert.doesNotMatch(
  component,
  /setPointerCapture/,
  'The moving orbit must not capture the pointer and interfere with pointer-up/click events.',
);

assert.match(
  component,
  /const wideDistance = Math\.hypot\(cosine \+ 0\.45, sine \+ 0\.8\)[\s\S]*?0\.54 \+ 0\.7 \* wideProximity/,
  'Product scale must grow as each product approaches the visual center of the orbit.',
);

assert.match(
  component,
  /const itemDensity = Math\.min\(1, 6 \/ Math\.max\(productCount, 1\)\)[\s\S]*?--orbit-item-density['"]:\s*itemDensity\.toFixed\(3\)[\s\S]*?orbitStyle\(angle, products\.length\)/,
  'Product image size must adjust to fit up to ten products on the orbit.',
);

assert.match(
  component,
  /AUTO_ROTATION_MS = 3600[\s\S]*?Math\.PI \* easedProgress/,
  'The collection must rotate by half a turn with a decelerating entry animation.',
);

assert.match(
  styles,
  /\.monitor-storefront\[data-dragging='true'\]\s+\.monitor-orbit-item\s*\{[\s\S]*?transition:\s*none;/,
  'Orbit items must not ease behind the pointer while the user is dragging.',
);

assert.match(
  styles,
  /\.monitor-storefront\[data-dragging='true'\]\s+\.monitor-product-stage,[\s\S]*?cursor:\s*grabbing;/,
  'The orbit must show a grabbing cursor during pointer drag.',
);

assert.match(
  styles,
  /\.monitor-storefront\[data-inertial='true'\]\s+\.monitor-orbit-item\s*\{[\s\S]*?transition:\s*none;/,
  'Orbit items must follow the short inertia animation without CSS transition lag.',
);

assert.match(
  styles,
  /width:\s*min\(64vw,\s*1280px\)[\s\S]*?height:\s*min\(68svh,\s*600px\)/,
  'The desktop orbit must scale to provide enough circumference for ten products.',
);

assert.match(
  styles,
  /width:\s*clamp\(112px,\s*calc\(24vw \* var\(--orbit-item-density\)\),\s*450px\)/,
  'Desktop product images must shrink as the collection approaches ten products.',
);

assert.match(
  styles,
  /width:\s*clamp\(56px,\s*calc\(25vw \* var\(--orbit-item-density\)\),\s*176px\)/,
  'Mobile product images must shrink as the collection approaches ten products.',
);

assert.match(
  styles,
  /--orbit-center-x:\s*85vw;[\s\S]*?--orbit-center-y:\s*80%;[\s\S]*?\.monitor-orbit-item\s*\{[\s\S]*?left:\s*var\(--orbit-center-x\)/,
  'The desktop product orbit must sit at four-fifths of the page height in the lower-right corner.',
);

assert.match(
  styles,
  /--orbit-center-x-mobile:\s*82%;[\s\S]*?--orbit-center-y-mobile:\s*80%;[\s\S]*?\.monitor-experience::before,\s*\.monitor-experience::after\s*\{[\s\S]*?left:\s*var\(--orbit-center-x-mobile\);[\s\S]*?top:\s*var\(--orbit-center-y-mobile\)/,
  'The mobile product orbit must also sit at four-fifths of the page height.',
);

assert.match(
  styles,
  /\.monitor-wheel\s*\{[\s\S]*?right:\s*clamp\(18px,\s*3vw,\s*48px\)[\s\S]*?width:\s*min\(380px,\s*40vw\)/,
  'The desktop rotation control must sit in the lower-right corner, away from the screen center.',
);

assert.match(
  styles,
  /\.monitor-wheel\s*\{[\s\S]*?right:\s*14px;[\s\S]*?left:\s*auto;[\s\S]*?width:\s*min\(340px,\s*calc\(100vw - 28px\)\)/,
  'The mobile rotation control must also align to the lower-right corner.',
);

assert.match(
  styles,
  /\.monitor-storefront\[data-view='moving'\][\s\S]*?\.monitor-orbit-item\[data-focused='true'\][\s\S]*?left:\s*var\(--detail-left-wide\);[\s\S]*?top:\s*var\(--detail-top-wide\);/,
  'A selected monitor must animate to one named detail anchor before its information appears.',
);

assert.match(
  styles,
  /\.monitor-detail-panel\s*\{[\s\S]*?top:\s*45%;[\s\S]*?right:\s*clamp\(32px,\s*5\.5vw,\s*88px\);[\s\S]*?width:\s*clamp\(340px,\s*28vw,\s*520px\)/,
  'The desktop detail panel must sit higher on the right with a readable, bounded content width.',
);

assert.match(
  styles,
  /\.monitor-detail-panel h2\s*\{[\s\S]*?max-width:\s*11ch;[\s\S]*?border-block:\s*1px solid var\(--monitor-accent\);[\s\S]*?font-size:\s*clamp\(40px,\s*3\.2vw,\s*54px\)/,
  'Product titles must have deliberate hierarchy and wrap within the detail panel.',
);

assert.match(
  styles,
  /\.monitor-detail-panel,\s*\.monitor-detail-panel\[data-visible='true'\]\s*\{[\s\S]*?background:\s*color-mix\(in srgb,\s*var\(--monitor-page\)\s*96%,\s*transparent\);[\s\S]*?backdrop-filter:\s*blur\(14px\)/,
  'Mobile product details must remain readable in a distinct scrollable surface.',
);

console.log('PASS: monitor orbit interaction regression checks');
