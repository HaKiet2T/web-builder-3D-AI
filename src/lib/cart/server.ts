import 'server-only';
import { getVariant } from '@/lib/catalog/dal';
import { validateCart } from '@/lib/cart/pricing';
import type { CartLineRequest } from '@/lib/cart/pricing';

/**
 * Server-only binding of the pure pricing logic to the catalogue.
 *
 * Route handlers use this; tests use `lib/cart/pricing` directly with a stub
 * lookup, which keeps the money logic unit-testable.
 */
export async function priceCart(lines: CartLineRequest[]) {
  const variantIds = [...new Set(lines.map((line) => line.variantId))];
  const records = await Promise.all(
    variantIds.map(async (variantId) => [variantId, await getVariant(variantId)] as const),
  );
  const variants = new Map(records);

  return validateCart(lines, (variantId) => variants.get(variantId) ?? null);
}