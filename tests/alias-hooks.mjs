/**
 * Resolve hook for running the domain modules under `node --test`.
 *
 * The app uses the `@/*` path alias from tsconfig, which Node does not know
 * about, and it uses extensionless imports (`@/lib/cart/pricing`). This hook
 * maps the alias onto `src/` and appends `.ts` when the exact file is missing,
 * so the same source files are tested without a bundler.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC_DIR = new URL('../src/', import.meta.url);

function toUrl(specifier) {
  return new URL(specifier.slice(2), SRC_DIR);
}

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) return nextResolve(specifier, context);

  const target = toUrl(specifier);
  const candidates = [target, new URL(`${target.href}.ts`), new URL(`${target.href}/index.ts`)];

  for (const candidate of candidates) {
    if (existsSync(fileURLToPath(candidate))) {
      return nextResolve(candidate.href, context);
    }
  }

  return nextResolve(target.href, context);
}