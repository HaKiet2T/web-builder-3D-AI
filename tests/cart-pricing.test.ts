import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeTotals,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  splitByAvailability,
  validateCart,
} from '../src/lib/cart/pricing.ts';
import type { CartItem, Product, Variant } from '../src/lib/catalog/types.ts';

/** Minimal product/variant pair for the lookup stub. */
function makeProduct(
  id: string,
  variantOverrides: Partial<Variant> = {},
): { product: Product; variant: Variant } {
  const productId = `prd_${id}`;
  const product: Product = {
    id: productId,
    slug: id,
    name: `Sản phẩm ${id}`,
    categoryId: 'monitor',
    summary: '',
    description: '',
    highlights: [],
    brand: 'Test',
    sourceUrl: null,
    media: [],
    variants: [],
    priceFrom: 0,
    purchasable: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const variant: Variant = {
    id: `var_${id}`,
    productId,
    slug: 'mac-dinh',
    name: 'Mặc định',
    sku: id.toUpperCase(),
    price: 1_000_000,
    compareAtPrice: null,
    stockStatus: 'in-stock',
    stockQuantity: 10,
    options: {},
    ...variantOverrides,
  };

  product.variants = [variant];
  return { product, variant };
}

const catalogue = new Map(
  [
    makeProduct('basic'),
    makeProduct('expensive', { price: 3_000_000 }),
    makeProduct('preorder', { stockStatus: 'preorder', stockQuantity: 0 }),
    makeProduct('soldout', { stockStatus: 'out-of-stock', stockQuantity: 0 }),
    makeProduct('scarce', { stockQuantity: 2 }),
    makeProduct('bulk', { stockQuantity: 500 }),
  ].map((entry) => [entry.variant.id, entry]),
);

const lookup = (variantId: string) => catalogue.get(variantId) ?? null;

describe('cart pricing', () => {
  it('prices a line from the catalogue, not from the request', () => {
    const result = validateCart(
      [{ variantId: 'var_basic', quantity: 2, unitPrice: 1 }],
      lookup,
    );

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].unitPrice, 1_000_000);
    // The bogus client price is reported but never applied.
    assert.ok(result.issues.some((issue) => issue.code === 'price-changed'));
    assert.equal(result.totals.subtotal, 2_000_000);
  });

  it('drops unknown variants instead of pricing them at zero', () => {
    const result = validateCart([{ variantId: 'var_missing', quantity: 1 }], lookup);

    assert.equal(result.items.length, 0);
    assert.equal(result.totals.subtotal, 0);
    assert.equal(result.issues[0].code, 'unknown-variant');
  });

  it('rejects out-of-stock lines', () => {
    const result = validateCart([{ variantId: 'var_soldout', quantity: 1 }], lookup);

    assert.equal(result.items.length, 0);
    assert.ok(result.issues.some((issue) => issue.code === 'out-of-stock'));
  });

  it('allows preorder lines even with zero stock on hand', () => {
    const result = validateCart([{ variantId: 'var_preorder', quantity: 3 }], lookup);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].stockStatus, 'preorder');
    assert.equal(result.items[0].quantity, 3);
  });

  it('caps quantity at the real stock on hand', () => {
    const result = validateCart([{ variantId: 'var_scarce', quantity: 50 }], lookup);

    assert.equal(result.items[0].quantity, 2);
    assert.ok(result.issues.some((issue) => issue.code === 'quantity-capped'));
  });

  it('caps quantity at the per-line maximum', () => {
    const result = validateCart([{ variantId: 'var_bulk', quantity: 500 }], lookup);

    assert.equal(result.items[0].quantity, 99);
    assert.ok(result.issues.some((issue) => issue.code === 'quantity-capped'));
  });

  it('charges shipping below the free threshold', () => {
    const totals = computeTotals([
      line({ unitPrice: 500_000, quantity: 1 }),
    ]);

    assert.equal(totals.shippingTotal, SHIPPING_FEE);
    assert.equal(totals.total, 500_000 + SHIPPING_FEE);
  });

  it('waives shipping at the free threshold', () => {
    const totals = computeTotals([line({ unitPrice: FREE_SHIPPING_THRESHOLD, quantity: 1 })]);

    assert.equal(totals.shippingTotal, 0);
    assert.equal(totals.total, FREE_SHIPPING_THRESHOLD);
  });

  it('charges no shipping for an empty cart', () => {
    const totals = computeTotals([]);

    assert.deepEqual(totals, { subtotal: 0, shippingTotal: 0, discountTotal: 0, total: 0 });
  });

  it('multiplies price by quantity in the subtotal', () => {
    const totals = computeTotals([line({ unitPrice: 700_000, quantity: 3 })]);

    assert.equal(totals.subtotal, 2_100_000);
  });
});

describe('split shipment grouping', () => {
  it('splits when in-stock and preorder lines are mixed', () => {
    const result = validateCart(
      [
        { variantId: 'var_basic', quantity: 1 },
        { variantId: 'var_preorder', quantity: 1 },
      ],
      lookup,
    );

    const groups = splitByAvailability(result.items);
    assert.equal(groups.isSplit, true);
    assert.equal(groups.inStock.length, 1);
    assert.equal(groups.preorder.length, 1);
  });

  it('does not split an all-in-stock cart', () => {
    const result = validateCart([{ variantId: 'var_basic', quantity: 1 }], lookup);
    const groups = splitByAvailability(result.items);

    assert.equal(groups.isSplit, false);
    assert.equal(groups.preorder.length, 0);
  });
});

function line(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'prd_x',
    variantId: 'var_x',
    name: 'X',
    variantName: 'Mặc định',
    imageUrl: null,
    unitPrice: 1_000_000,
    quantity: 1,
    stockStatus: 'in-stock',
    ...overrides,
  };
}