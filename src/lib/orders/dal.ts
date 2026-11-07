import 'server-only';
import { z } from 'zod';
import { requireAdminSupabaseClient } from '@/lib/admin/auth';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { getSupabaseConfig } from '@/lib/supabase/config';
import type { OrderRow } from '@/lib/supabase/database.types';
import type { Fulfillment, Order, OrderItem, OrderStatus } from '@/types/order';

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export class OrderPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderPersistenceError';
  }
}

const CustomerSchema: z.ZodType<Order['customer']> = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

const OrderItemSchema: z.ZodType<OrderItem> = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  name: z.string(),
  variant: z.string(),
  price: z.number(),
  quantity: z.number(),
  stockStatus: z.enum(['in-stock', 'preorder']),
  fulfillmentId: z.string().optional(),
});

const FulfillmentSchema: z.ZodType<Fulfillment> = z.object({
  id: z.string(),
  orderId: z.string(),
  type: z.enum(['in-stock', 'preorder']),
  status: z.enum(['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled']),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  items: z.array(OrderItemSchema),
  shippingFee: z.number(),
  estimatedDelivery: z.string(),
  shippedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  createdAt: z.string(),
});

function parseJson<T>(schema: z.ZodType<T>, value: Json, label: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(`Invalid ${label} data stored in Supabase.`);
  return parsed.data;
}

function toJson(value: unknown): Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot store non-finite order values.');
    return value;
  }
  if (Array.isArray(value)) return value.map(toJson);
  if (typeof value === 'object') {
    const result: { [key: string]: Json | undefined } = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) result[key] = toJson(entry);
    }
    return result;
  }
  throw new Error('Order contains a value that cannot be stored as JSON.');
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customer: parseJson(CustomerSchema, row.customer, 'order customer'),
    items: parseJson(z.array(OrderItemSchema), row.items, 'order items'),
    fulfillments: parseJson(z.array(FulfillmentSchema), row.fulfillments, 'order fulfillments'),
    subtotal: Number(row.subtotal),
    shippingTotal: Number(row.shipping_total),
    discountTotal: Number(row.discount_total),
    totalAmount: Number(row.total_amount),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paymentTransactionId: row.payment_transaction_id ?? undefined,
    isSplitShipment: row.is_split_shipment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminOrders(): Promise<Order[]> {
  const supabase = await requireAdminSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Could not load orders: ${error.message}`);
  return (data ?? []).map(mapOrder);
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const supabase = await requireAdminSupabaseClient();
  const paymentStatus =
    status === 'paid' ? 'paid' : status === 'failed' ? 'failed' : undefined;
  const updateData: {
    status: OrderStatus;
    payment_status?: Order['paymentStatus'];
    updated_at: string;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (paymentStatus) updateData.payment_status = paymentStatus;

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Could not update order status: ${error.message}`);
  if (!data) throw new Error('Order was not found or cannot be updated.');
}

export async function decrementVariantInventory(
  order: Order,
  client?: ReturnType<typeof createServiceSupabaseClient>,
): Promise<void> {
  const supabase = client ?? createServiceSupabaseClient();
  if (!supabase) return;

  const inStockItems = order.items.filter((item) => item.stockStatus === 'in-stock');
  for (const item of inStockItems) {
    if (!item.variantId) continue;

    const { data: variant, error: fetchError } = await supabase
      .from('product_variants')
      .select('id, stock_quantity, stock_status')
      .eq('id', item.variantId)
      .maybeSingle();

    if (fetchError || !variant) continue;

    const newQuantity = Math.max(0, variant.stock_quantity - item.quantity);
    const newStatus = newQuantity === 0 ? 'out-of-stock' : variant.stock_status;

    await supabase
      .from('product_variants')
      .update({
        stock_quantity: newQuantity,
        stock_status: newStatus,
      })
      .eq('id', item.variantId);
  }
}

export async function getOrderByIdOrNumber(idOrNumber: string): Promise<Order | null> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`id.eq.${idOrNumber},order_number.eq.${idOrNumber}`)
    .maybeSingle();

  if (error || !data) return null;
  return mapOrder(data);
}

export const getOrderById = getOrderByIdOrNumber;

export async function persistCheckoutOrder(order: Order): Promise<boolean> {
  if (!getSupabaseConfig()) return false;

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    throw new OrderPersistenceError(
      'SUPABASE_SERVICE_ROLE_KEY is required to persist guest checkout orders.',
    );
  }

  const { error } = await supabase.from('orders').insert({
    id: order.id,
    order_number: order.orderNumber,
    customer: toJson(order.customer),
    items: toJson(order.items),
    fulfillments: toJson(order.fulfillments),
    subtotal: order.subtotal,
    shipping_total: order.shippingTotal,
    discount_total: order.discountTotal,
    total_amount: order.totalAmount,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    payment_transaction_id: order.paymentTransactionId ?? null,
    is_split_shipment: order.isSplitShipment,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  });

  if (error) throw new OrderPersistenceError(`Could not persist checkout order: ${error.message}`);

  // Automatically sync inventory for in-stock items
  try {
    await decrementVariantInventory(order, supabase);
  } catch (inventoryError) {
    console.error('[Inventory] Could not decrement variant inventory:', inventoryError);
  }

  return true;
}

export async function applyPaymentWebhookUpdate(input: {
  orderId: string;
  status?: OrderStatus;
  paymentStatus: Order['paymentStatus'];
  transactionId?: string;
}): Promise<void> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    throw new OrderPersistenceError(
      'SUPABASE_SERVICE_ROLE_KEY is required to update payment orders.',
    );
  }

  const updateData: {
    status?: OrderStatus;
    payment_status: Order['paymentStatus'];
    payment_transaction_id: string | null;
    updated_at: string;
  } = {
    payment_status: input.paymentStatus,
    payment_transaction_id: input.transactionId ?? null,
    updated_at: new Date().toISOString(),
  };
  if (input.status) updateData.status = input.status;

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', input.orderId)
    .select('id')
    .maybeSingle();

  if (error) throw new OrderPersistenceError(`Could not update payment order: ${error.message}`);
  if (!data) throw new OrderPersistenceError('Payment webhook references an unknown order.');
}
