import type { Order } from '@/types/order';

/**
 * Maps raw database row (where customer/items/fulfillments can be JSON or stringified JSON)
 * into a strongly-typed Order object.
 */
export function mapOrderRowToOrder(row: Record<string, unknown>): Order {
  const customer = typeof row.customer === 'string' ? JSON.parse(row.customer) : (row.customer ?? {});
  const items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items ?? []);
  const fulfillments =
    typeof row.fulfillments === 'string' ? JSON.parse(row.fulfillments) : (row.fulfillments ?? []);

  return {
    id: String(row.id),
    orderNumber: String(row.order_number ?? row.orderNumber ?? ''),
    userId: (row.user_id ?? row.userId) as string | undefined,
    customer: customer as Order['customer'],
    items: items as Order['items'],
    fulfillments: fulfillments as Order['fulfillments'],
    subtotal: Number(row.subtotal ?? 0),
    shippingTotal: Number(row.shipping_total ?? row.shippingTotal ?? 0),
    discountTotal: Number(row.discount_total ?? row.discountTotal ?? 0),
    totalAmount: Number(row.total_amount ?? row.totalAmount ?? 0),
    status: (row.status ?? 'pending') as Order['status'],
    paymentStatus: (row.payment_status ?? row.paymentStatus ?? 'pending') as Order['paymentStatus'],
    paymentMethod: String(row.payment_method ?? row.paymentMethod ?? 'cod'),
    paymentTransactionId: (row.payment_transaction_id ?? row.paymentTransactionId) as string | undefined,
    isSplitShipment: Boolean(row.is_split_shipment ?? row.isSplitShipment ?? false),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}
