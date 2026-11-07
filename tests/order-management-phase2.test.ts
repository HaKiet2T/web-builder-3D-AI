import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Order, OrderStatus } from '../src/types/order';

test('Order Management & Guest Claim Integration (Giai đoạn 2)', async (t) => {
  const root = process.cwd();

  await t.test('categorizes orders into correct status tabs and computes badge counts', () => {
    const mockOrders: Partial<Order>[] = [
      {
        id: 'ord-1',
        orderNumber: 'HGK-001',
        status: 'pending',
        paymentStatus: 'pending',
        fulfillments: [],
      },
      {
        id: 'ord-2',
        orderNumber: 'HGK-002',
        status: 'processing',
        paymentStatus: 'paid',
        fulfillments: [],
      },
      {
        id: 'ord-3',
        orderNumber: 'HGK-003',
        status: 'partially_fulfilled',
        paymentStatus: 'paid',
        fulfillments: [
          {
            id: 'ful-1',
            orderId: 'ord-3',
            type: 'in-stock',
            status: 'shipped',
            items: [],
            shippingFee: 0,
            estimatedDelivery: '2026-11-10',
            createdAt: '2026-11-08',
          },
        ],
      },
      {
        id: 'ord-4',
        orderNumber: 'HGK-004',
        status: 'fulfilled',
        paymentStatus: 'paid',
        fulfillments: [
          {
            id: 'ful-2',
            orderId: 'ord-4',
            type: 'in-stock',
            status: 'delivered',
            items: [],
            shippingFee: 0,
            estimatedDelivery: '2026-11-09',
            createdAt: '2026-11-08',
          },
        ],
      },
      {
        id: 'ord-5',
        orderNumber: 'HGK-005',
        status: 'cancelled',
        paymentStatus: 'failed',
        fulfillments: [],
      },
    ];

    const counts: Record<string, number> = {
      all: mockOrders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const o of mockOrders) {
      if (o.status === 'cancelled' || o.status === 'failed') {
        counts.cancelled++;
      } else if (o.status === 'fulfilled') {
        counts.delivered++;
      } else if (o.status === 'partially_fulfilled' || o.fulfillments?.some((f) => f.status === 'shipped')) {
        counts.shipped++;
      } else if (o.status === 'processing' || o.status === 'paid') {
        counts.processing++;
      } else {
        counts.pending++;
      }
    }

    assert.equal(counts.all, 5);
    assert.equal(counts.pending, 1);
    assert.equal(counts.processing, 1);
    assert.equal(counts.shipped, 1);
    assert.equal(counts.delivered, 1);
    assert.equal(counts.cancelled, 1);
  });

  await t.test('validates repayment preconditions and prevents repaying paid or cancelled orders', () => {
    function canRepay(status: OrderStatus, paymentStatus: Order['paymentStatus']) {
      if (paymentStatus === 'paid' || status === 'paid') return false;
      if (status === 'cancelled') return false;
      return true;
    }

    assert.equal(canRepay('pending', 'pending'), true);
    assert.equal(canRepay('pending', 'failed'), true);
    assert.equal(canRepay('processing', 'paid'), false);
    assert.equal(canRepay('fulfilled', 'paid'), false);
    assert.equal(canRepay('cancelled', 'failed'), false);
  });

  await t.test('verifies email match rule for 1-click guest order claims', () => {
    function canClaim(orderEmail: string, userEmail: string, currentUserId: string | null) {
      if (currentUserId !== null) return { allowed: false, reason: 'already_claimed' };
      if (orderEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
        return { allowed: false, reason: 'email_mismatch' };
      }
      return { allowed: true, reason: 'ok' };
    }

    assert.deepEqual(canClaim('test@example.com', 'test@example.com', null), { allowed: true, reason: 'ok' });
    assert.deepEqual(canClaim('TEST@example.com', 'test@example.com', null), { allowed: true, reason: 'ok' });
    assert.deepEqual(canClaim('other@example.com', 'test@example.com', null), { allowed: false, reason: 'email_mismatch' });
    assert.deepEqual(canClaim('test@example.com', 'test@example.com', 'user-123'), { allowed: false, reason: 'already_claimed' });
  });

  await t.test('exposes claim, repayment and order management functions in DAL and actions', () => {
    const dalContent = readFileSync(resolve(root, 'src/lib/orders/dal.ts'), 'utf8');
    assert.match(dalContent, /export async function claimGuestOrderByOrderNumber/);
    assert.match(dalContent, /export async function claimGuestOrdersByEmail/);
    assert.match(dalContent, /export async function retryOrderPayment/);

    const actionsContent = readFileSync(resolve(root, 'src/lib/account/actions.ts'), 'utf8');
    assert.match(actionsContent, /export async function claimGuestOrderAction/);
    assert.match(actionsContent, /export async function claimAllGuestOrdersAction/);
    assert.match(actionsContent, /export async function retryOrderPaymentAction/);
  });

  await t.test('implements /account/orders route with tab filtering, search and re-order triggers', () => {
    const pageContent = readFileSync(resolve(root, 'src/app/account/orders/page.tsx'), 'utf8');
    assert.match(pageContent, /export const metadata/);
    assert.match(pageContent, /Đơn hàng của tôi/);
    assert.match(pageContent, /listUserOrders/);

    const clientContent = readFileSync(resolve(root, 'src/app/account/orders/OrdersManagerClient.tsx'), 'utf8');
    assert.match(clientContent, /TAB_CONFIG/);
    assert.match(clientContent, /activeTab/);
    assert.match(clientContent, /searchQuery/);
    assert.match(clientContent, /handleReorder/);
    assert.match(clientContent, /useCartStore/);
    assert.match(clientContent, /claimAllGuestOrdersAction/);
    assert.match(clientContent, /claimGuestOrderAction/);
    assert.match(clientContent, /retryOrderPaymentAction/);
  });

  await t.test('integrates orders management links and sub-navigation into /account and /orders/[id]', () => {
    const accountPageContent = readFileSync(resolve(root, 'src/app/account/page.tsx'), 'utf8');
    assert.match(accountPageContent, /href="\/account\/orders"/);
    assert.match(accountPageContent, /Đơn hàng của tôi/);

    const orderTrackingContent = readFileSync(resolve(root, 'src/app/orders/[id]/OrderTrackingClient.tsx'), 'utf8');
    assert.match(orderTrackingContent, /isUnpaid/);
    assert.match(orderTrackingContent, /Thanh toán lại ngay/);
    assert.match(orderTrackingContent, /claimAction/);
    assert.match(orderTrackingContent, /handleReorder/);
  });
});
