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
  /drag\.startRotation\s*\+\s*dragDistance\s*\*\s*DRAG_RADIANS_PER_PIXEL/,
  'Pointer drag must update the orbit from its horizontal distance, not a delayed angular delta.',
);

assert.match(
  styles,
  /\.monitor-storefront\[data-dragging='true'\]\s+\.monitor-orbit-item\s*\{[\s\S]*?transition:\s*none;/,
  'Orbit items must not ease behind the pointer while the user is dragging.',
);

assert.match(
  styles,
  /\.monitor-storefront\[data-view='moving'\][\s\S]*?\.monitor-orbit-item\[data-focused='true'\][\s\S]*?left:\s*var\(--detail-left-wide\);[\s\S]*?top:\s*var\(--detail-top-wide\);/,
  'A selected monitor must animate to one named detail anchor before its information appears.',
);

console.log('PASS: monitor orbit interaction regression checks');
