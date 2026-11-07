import { register } from 'node:module';

// Teach the Node test runner the app's `@/*` path alias so the domain modules
// run unmodified, without a bundler or a duplicate build step.
register('./alias-hooks.mjs', import.meta.url);