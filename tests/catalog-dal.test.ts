import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  countProductsByCategory,
  getCategory,
  getProductBySlug,
  getVariant,
  listCategories,
  listProducts,
  listProductsByCategory,
  listPurchasableProducts,
} from '../src/lib/catalog/dal.ts';
import { persistCheckoutOrder } from '../src/lib/orders/dal.ts';

const supabaseEnvKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
] as const;
const originalEnv = new Map(
  supabaseEnvKeys.map((key) => [key, process.env[key]]),
);

before(() => {
  for (const key of supabaseEnvKeys) delete process.env[key];
});

after(() => {
  for (const key of supabaseEnvKeys) {
    const original = originalEnv.get(key);
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
});

describe('catalogue DAL sample fallback', () => {
  it('serves categories and products from the sample catalogue without Supabase', async () => {
    const [categories, products] = await Promise.all([listCategories(), listProducts()]);

    assert.equal(categories.length, 5);
    assert.ok(products.length >= 10);
    assert.equal(categories[0].id, 'monitor');
    assert.ok(products.every((product) => product.variants.length > 0));
  });

  it('resolves categories by id or slug and returns an empty list for unknown categories', async () => {
    assert.equal((await getCategory('speaker'))?.name, 'Loa');
    assert.equal((await getCategory('unknown-category')), null);
    assert.deepEqual(await listProductsByCategory('unknown-category'), []);
  });

  it('keeps variant lookups and purchasable product selection on the sample data', async () => {
    const product = await getProductBySlug('rog-strix-xg259cms');
    assert.ok(product);
    const record = await getVariant(product.variants[0].id);
    assert.equal(record?.product.id, product.id);
    assert.ok((await listPurchasableProducts('monitor')).length > 0);
    assert.ok((await countProductsByCategory()).monitor > 0);
  });

  it('marks preview checkout orders as non-persistent without a Supabase project', async () => {
    const persisted = await persistCheckoutOrder({
      id: 'preview-order',
      orderNumber: 'HGK-PREVIEW',
      customer: {
        fullName: 'Test',
        email: 'test@example.com',
        phone: '0900000000',
        address: 'Test address',
        city: 'Test city',
      },
      items: [],
      fulfillments: [],
      subtotal: 0,
      shippingTotal: 0,
      discountTotal: 0,
      totalAmount: 0,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cod',
      isSplitShipment: false,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });

    assert.equal(persisted, false);
  });
});
