import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CartPayloadSchema, CheckoutPayloadSchema } from '@/lib/cart/schema';

describe('cart and checkout payload normalization', () => {
  it('accepts items payload in cart validation and exposes both items and lines', () => {
    const result = CartPayloadSchema.safeParse({
      items: [{ variantId: 'var-1', quantity: 2 }],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.items, [{ variantId: 'var-1', quantity: 2 }]);
      assert.deepEqual(result.data.lines, [{ variantId: 'var-1', quantity: 2 }]);
    }
  });

  it('accepts legacy lines payload in cart validation and exposes both items and lines', () => {
    const result = CartPayloadSchema.safeParse({
      lines: [{ variantId: 'var-2', quantity: 1, unitPrice: 50000 }],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.items, [{ variantId: 'var-2', quantity: 1, unitPrice: 50000 }]);
      assert.deepEqual(result.data.lines, [{ variantId: 'var-2', quantity: 1, unitPrice: 50000 }]);
    }
  });

  it('rejects empty payload when neither items nor lines are provided in cart validation', () => {
    const result = CartPayloadSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('accepts lines payload in checkout and normalizes to items and lines', () => {
    const result = CheckoutPayloadSchema.safeParse({
      customer: {
        fullName: 'Hà Gia Kiệt',
        email: 'kietjob24h@gmail.com',
        phone: '0987654321',
        address: '123 Đường ABC',
        city: 'Hồ Chí Minh',
      },
      lines: [{ variantId: 'var-1', quantity: 1 }],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.items, [{ variantId: 'var-1', quantity: 1 }]);
      assert.deepEqual(result.data.lines, [{ variantId: 'var-1', quantity: 1 }]);
    }
  });

  it('accepts items payload in checkout and normalizes to items and lines', () => {
    const result = CheckoutPayloadSchema.safeParse({
      customer: {
        fullName: 'Hà Gia Kiệt',
        email: 'kietjob24h@gmail.com',
        phone: '0987654321',
        address: '123 Đường ABC',
        city: 'Hồ Chí Minh',
      },
      items: [{ variantId: 'var-1', quantity: 1 }],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.items, [{ variantId: 'var-1', quantity: 1 }]);
      assert.deepEqual(result.data.lines, [{ variantId: 'var-1', quantity: 1 }]);
    }
  });

  it('rejects checkout when items or lines are empty', () => {
    const result = CheckoutPayloadSchema.safeParse({
      customer: {
        fullName: 'Hà Gia Kiệt',
        email: 'kietjob24h@gmail.com',
        phone: '0987654321',
        address: '123 Đường ABC',
        city: 'Hồ Chí Minh',
      },
      items: [],
    });
    assert.equal(result.success, false);
  });
});
