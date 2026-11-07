import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildOrder } from '../src/lib/orders/build-order.ts';
import { computeTotals, shippingFor, SHIPPING_FEE } from '../src/lib/cart/pricing.ts';
import type { CartItem } from '../src/lib/catalog/types.ts';
import type { CustomerInfo } from '../src/types/order.ts';

const customer: CustomerInfo = {
  fullName: 'Nguyễn Văn A',
  email: 'a@example.com',
  phone: '0901234567',
  address: '12 Nguyễn Huệ',
  city: 'Hồ Chí Minh',
};

const FIXED_NOW = new Date('2026-03-01T10:00:00.000Z');

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'prd_monitor',
    variantId: 'var_monitor',
    name: 'ROG Strix XG259CMS',
    variantName: 'Tiêu chuẩn',
    imageUrl: null,
    unitPrice: 6_490_000,
    quantity: 1,
    stockStatus: 'in-stock',
    ...overrides,
  };
}

describe('buildOrder', () => {
  it('creates one fulfillment for an all in-stock cart', () => {
    const order = buildOrder({
      items: [item()],
      customer,
      paymentMethod: 'cod',
      now: FIXED_NOW,
      idSuffix: 'test1',
    });

    assert.equal(order.isSplitShipment, false);
    assert.equal(order.fulfillments.length, 1);
    assert.equal(order.fulfillments[0].type, 'in-stock');
    assert.equal(order.items[0].fulfillmentId, order.fulfillments[0].id);
  });

  it('splits a mixed cart into two fulfillments', () => {
    const order = buildOrder({
      items: [
        item(),
        item({ productId: 'prd_kb', variantId: 'var_kb', stockStatus: 'preorder', unitPrice: 5_990_000 }),
      ],
      customer,
      paymentMethod: 'cod',
      now: FIXED_NOW,
      idSuffix: 'test2',
    });

    assert.equal(order.isSplitShipment, true);
    assert.equal(order.fulfillments.length, 2);
    assert.deepEqual(
      order.fulfillments.map((fulfillment) => fulfillment.type).sort(),
      ['in-stock', 'preorder'],
    );
    // Each product must be assigned to exactly one package.
    assert.equal(order.items.every((line) => Boolean(line.fulfillmentId)), true);
    const assigned = new Set(order.fulfillments.flatMap((f) => f.items.map((i) => i.id)));
    assert.equal(assigned.size, order.items.length);
  });

  it('charges shipping per package for a split order, matching the cart preview', () => {
    // Below the free-shipping threshold, so a two-package cart pays two fees.
    const items = [
      item({ unitPrice: 500_000 }),
      item({ variantId: 'var_kb', stockStatus: 'preorder', unitPrice: 400_000 }),
    ];
    const order = buildOrder({
      items,
      customer,
      paymentMethod: 'cod',
      now: FIXED_NOW,
      idSuffix: 'test3',
    });

    // Regression: the cart quoted one flat fee while checkout charged two, so
    // the confirmation total differed from the total on the button the shopper
    // pressed. Both now read the same rule.
    assert.equal(order.shippingTotal, shippingFor(items));
    assert.equal(order.shippingTotal, SHIPPING_FEE * 2);
    assert.equal(order.subtotal, 900_000);
    assert.equal(order.totalAmount, 900_000 + SHIPPING_FEE * 2);
    assert.equal(
      order.fulfillments.reduce((sum, f) => sum + f.shippingFee, 0),
      order.shippingTotal,
    );
  });

  it('ships a split order free once the cart passes the threshold', () => {
    const items = [
      item({ unitPrice: 1_500_000 }),
      item({ variantId: 'var_kb', stockStatus: 'preorder', unitPrice: 1_000_000 }),
    ];
    const order = buildOrder({
      items,
      customer,
      paymentMethod: 'cod',
      now: FIXED_NOW,
      idSuffix: 'free',
    });

    assert.equal(order.isSplitShipment, true);
    assert.equal(order.shippingTotal, 0);
    assert.equal(order.totalAmount, 2_500_000);
  });

  it('agrees with the cart preview for every cart shape', () => {
    const shapes: CartItem[][] = [
      [item()],
      [item({ unitPrice: 50_000 })],
      [item(), item({ variantId: 'v2', stockStatus: 'preorder', unitPrice: 900_000 })],
      [item({ stockStatus: 'preorder' })],
      [item({ unitPrice: 3_000_000 })],
    ];

    for (const items of shapes) {
      const order = buildOrder({
        items,
        customer,
        paymentMethod: 'cod',
        now: FIXED_NOW,
        idSuffix: 'agree',
      });

      assert.equal(
        order.totalAmount,
        computeTotals(items).total,
        `order total must equal the cart total for ${items.length} line(s)`,
      );
    }
  });

  it('waives shipping on a single high-value package', () => {
    const order = buildOrder({
      items: [item({ unitPrice: 3_000_000 })],
      customer,
      paymentMethod: 'cod',
      now: FIXED_NOW,
      idSuffix: 'test4',
    });

    assert.equal(order.shippingTotal, 0);
    assert.equal(order.totalAmount, 3_000_000);
  });

  it('marks an all-preorder cart as a single preorder package', () => {
    const order = buildOrder({
      items: [item({ stockStatus: 'preorder' })],
      customer,
      paymentMethod: 'cod',
      now: FIXED_NOW,
      idSuffix: 'test5',
    });

    assert.equal(order.isSplitShipment, false);
    assert.equal(order.fulfillments.length, 1);
    assert.equal(order.fulfillments[0].type, 'preorder');
  });

  it('multiplies line price by quantity', () => {
    const order = buildOrder({
      items: [item({ unitPrice: 1_000_000, quantity: 3 })],
      customer,
      paymentMethod: 'cod',
      now: FIXED_NOW,
      idSuffix: 'test6',
    });

    assert.equal(order.subtotal, 3_000_000);
    assert.equal(order.items[0].quantity, 3);
  });

  it('starts every order as pending payment', () => {
    const order = buildOrder({
      items: [item()],
      customer,
      paymentMethod: 'stripe',
      now: FIXED_NOW,
      idSuffix: 'test7',
    });

    assert.equal(order.status, 'pending');
    assert.equal(order.paymentStatus, 'pending');
    assert.equal(order.paymentMethod, 'stripe');
  });
});