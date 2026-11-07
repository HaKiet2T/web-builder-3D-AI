import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildOrder } from '../src/lib/orders/build-order.ts';
import { decrementVariantInventory } from '../src/lib/orders/dal.ts';
import { mapOrderRowToOrder } from '../src/lib/orders/order-mapper.ts';
import type { CartItem } from '../src/lib/catalog/types.ts';
import type { CustomerInfo, Order } from '../src/types/order.ts';

const realtimeMigration = readFileSync(
  'supabase/migrations/20261107220000_realtime_setup.sql',
  'utf8',
);
const adminRealtimeComponent = readFileSync(
  'src/app/admin/(dashboard)/orders/AdminOrdersRealtime.tsx',
  'utf8',
);
const trackingComponent = readFileSync(
  'src/app/orders/[id]/OrderTrackingClient.tsx',
  'utf8',
);

describe('Targeted Realtime for Orders and Inventory Synchronization', () => {
  const customer: CustomerInfo = {
    fullName: 'Lê Hoàng Nam',
    email: 'nam.le@example.com',
    phone: '0901234567',
    address: '123 Nguyễn Huệ',
    city: 'Hồ Chí Minh',
  };

  const sampleCartItem: CartItem = {
    productId: 'prod-rog-xg259cms',
    name: 'Màn hình ASUS ROG Strix XG259CMS',
    variantId: 'var-xg259-black',
    variantName: 'Đen Nhám',
    imageUrl: null,
    unitPrice: 10990000,
    quantity: 2,
    stockStatus: 'in-stock',
  };

  it('attaches variantId to each order item during buildOrder for inventory tracking', () => {
    const order = buildOrder({
      items: [sampleCartItem],
      customer,
      paymentMethod: 'cod',
      now: new Date('2026-11-07T12:00:00Z'),
      idSuffix: 'test01',
    });

    assert.equal(order.items.length, 1);
    assert.equal(order.items[0].productId, 'prod-rog-xg259cms');
    assert.equal(order.items[0].variantId, 'var-xg259-black');
    assert.equal(order.items[0].quantity, 2);
    assert.equal(order.items[0].stockStatus, 'in-stock');
  });

  it('decrements variant inventory and updates stock_status to out-of-stock when reaching 0', async () => {
    const mockOrder: Order = {
      id: 'ord_test_inv',
      orderNumber: 'HGK-2026000001',
      customer,
      items: [
        {
          id: 'item-1',
          productId: 'prod-rog-xg259cms',
          variantId: 'var-xg259-black',
          name: 'Màn hình ASUS ROG Strix XG259CMS',
          variant: 'Đen Nhám',
          price: 10990000,
          quantity: 5,
          stockStatus: 'in-stock',
        },
      ],
      fulfillments: [],
      subtotal: 54950000,
      shippingTotal: 0,
      discountTotal: 0,
      totalAmount: 54950000,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cod',
      isSplitShipment: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedPayload: { stock_quantity: number; stock_status: string } | null = null;
    let targetVariantId: string | null = null;

    const mockSupabase = {
      from: (table: string) => {
        assert.equal(table, 'product_variants');
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'var-xg259-black', stock_quantity: 5, stock_status: 'in-stock' },
                error: null,
              }),
            }),
          }),
          update: (payload: { stock_quantity: number; stock_status: string }) => {
            updatedPayload = payload;
            return {
              eq: (col: string, val: string) => {
                targetVariantId = val;
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    } as unknown as Parameters<typeof decrementVariantInventory>[1];

    await decrementVariantInventory(mockOrder, mockSupabase);

    assert.equal(targetVariantId, 'var-xg259-black');
    assert.deepEqual(updatedPayload, {
      stock_quantity: 0,
      stock_status: 'out-of-stock',
    });
  });

  it('correctly maps raw database row with JSON or stringified payloads to Order domain model', () => {
    const rawRow = {
      id: 'ord_123',
      order_number: 'HGK-2026999999',
      customer: JSON.stringify(customer),
      items: JSON.stringify([
        {
          id: 'item_1',
          productId: 'prod_1',
          variantId: 'var_1',
          name: 'Bàn phím cơ',
          variant: 'Silent Red',
          price: 2500000,
          quantity: 1,
          stockStatus: 'in-stock',
        },
      ]),
      fulfillments: JSON.stringify([]),
      subtotal: '2500000',
      shipping_total: '35000',
      discount_total: '0',
      total_amount: '2535000',
      status: 'paid',
      payment_status: 'paid',
      payment_method: 'vnpay',
      payment_transaction_id: 'txn_vnp_777',
      is_split_shipment: false,
      created_at: '2026-11-07T14:00:00Z',
      updated_at: '2026-11-07T14:05:00Z',
    };

    const order = mapOrderRowToOrder(rawRow);

    assert.equal(order.id, 'ord_123');
    assert.equal(order.orderNumber, 'HGK-2026999999');
    assert.equal(order.customer.fullName, 'Lê Hoàng Nam');
    assert.equal(order.items.length, 1);
    assert.equal(order.items[0].variantId, 'var_1');
    assert.equal(order.totalAmount, 2535000);
    assert.equal(order.status, 'paid');
    assert.equal(order.paymentStatus, 'paid');
    assert.equal(order.paymentTransactionId, 'txn_vnp_777');
  });

  it('enforces publication and replica identity in Supabase migration', () => {
    assert.match(
      realtimeMigration,
      /alter publication supabase_realtime add table public\.orders;/,
      'Migration must add public.orders to supabase_realtime',
    );
    assert.match(
      realtimeMigration,
      /alter publication supabase_realtime add table public\.product_variants;/,
      'Migration must add public.product_variants to supabase_realtime',
    );
    assert.match(
      realtimeMigration,
      /alter table public\.orders replica identity full;/,
      'Migration must set full replica identity on orders',
    );
  });

  it('integrates live realtime status badge and instant notification in AdminOrdersRealtime', () => {
    assert.match(adminRealtimeComponent, /data-testid="realtime-status-badge"/);
    assert.match(adminRealtimeComponent, /data-testid="new-order-alert"/);
    assert.match(adminRealtimeComponent, /Realtime đang kết nối/);
    assert.match(adminRealtimeComponent, /ORDER_STATUSES/);
  });

  it('provides real-time payment status tracking and celebration in OrderTrackingClient', () => {
    assert.match(trackingComponent, /data-testid="order-status-badge"/);
    assert.match(trackingComponent, /data-testid="payment-success-celebration"/);
    assert.match(trackingComponent, /triggerPaymentSuccess/);
    assert.match(trackingComponent, /THEO DÕI ĐƠN HÀNG THỜI GIAN THỰC/);
  });
});
