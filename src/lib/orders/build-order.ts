import { shippingFor } from '@/lib/cart/pricing';
import type { CartItem } from '@/lib/catalog/types';
import type { CustomerInfo, Fulfillment, Order, OrderItem } from '@/types/order';

/**
 * Order assembly.
 *
 * Pure functions so the split-shipment rules can be tested without a server or
 * a payment provider. Callers pass server-priced cart items; nothing here trusts
 * a price that came from the browser.
 */

export interface BuildOrderOptions {
  /** Server-priced lines. */
  items: CartItem[];
  customer: CustomerInfo;
  paymentMethod: string;
  /** Injected so tests are deterministic; defaults to now. */
  now?: Date;
  /** Injected so tests are deterministic; defaults to a random suffix. */
  idSuffix?: string;
}

export function buildOrder({
  items,
  customer,
  paymentMethod,
  now = new Date(),
  idSuffix = Math.random().toString(36).slice(2, 8),
}: BuildOrderOptions): Order {
  const timestamp = now.toISOString();
  const orderId = `ord_${now.getTime().toString(36)}_${idSuffix}`;
  const orderNumber = `HGK-${now.getFullYear()}${String(now.getTime()).slice(-6)}`;

  const orderItems: OrderItem[] = items.map((item, index) => ({
    id: `${orderId}_item_${index + 1}`,
    productId: item.productId,
    variantId: item.variantId,
    name: item.name,
    variant: item.variantName,
    price: item.unitPrice,
    quantity: item.quantity,
    stockStatus: item.stockStatus === 'preorder' ? 'preorder' : 'in-stock',
  }));

  const inStockItems = orderItems.filter((item) => item.stockStatus === 'in-stock');
  const preorderItems = orderItems.filter((item) => item.stockStatus === 'preorder');
  const isSplitShipment = inStockItems.length > 0 && preorderItems.length > 0;

  const fulfillments: Fulfillment[] = [];

  // Charge exactly what the cart preview quoted: one rule for both, so the
  // shopper is never charged more than the number on the button they pressed.
  const shippingTotal = shippingFor(items);
  const feePerPackage = isSplitShipment ? shippingTotal / 2 : shippingTotal;

  if (isSplitShipment) {
    // Two packages, so shipping is charged twice — this is the whole point of
    // the split: the in-stock box ships now, the preorder box ships later.
    const inStockId = `${orderId}_ful_instock`;
    inStockItems.forEach((item) => {
      item.fulfillmentId = inStockId;
    });
    fulfillments.push({
      id: inStockId,
      orderId,
      type: 'in-stock',
      status: 'pending',
      items: inStockItems,
      shippingFee: feePerPackage,
      estimatedDelivery: '2 - 4 ngày làm việc (Giao ngay)',
      createdAt: timestamp,
    });

    const preorderId = `${orderId}_ful_preorder`;
    preorderItems.forEach((item) => {
      item.fulfillmentId = preorderId;
    });
    fulfillments.push({
      id: preorderId,
      orderId,
      type: 'preorder',
      status: 'pending',
      items: preorderItems,
      shippingFee: feePerPackage,
      estimatedDelivery: '14 - 21 ngày làm việc (Đợt hàng xuất xưởng)',
      createdAt: timestamp,
    });
  } else {
    const singleId = `${orderId}_ful_main`;
    orderItems.forEach((item) => {
      item.fulfillmentId = singleId;
    });
    const type = preorderItems.length > 0 ? 'preorder' : 'in-stock';
    fulfillments.push({
      id: singleId,
      orderId,
      type,
      status: 'pending',
      items: orderItems,
      shippingFee: shippingTotal,
      estimatedDelivery: type === 'preorder' ? '14 - 21 ngày làm việc' : '2 - 4 ngày làm việc',
      createdAt: timestamp,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return {
    id: orderId,
    orderNumber,
    customer,
    items: orderItems,
    fulfillments,
    subtotal,
    shippingTotal,
    discountTotal: 0,
    totalAmount: subtotal + shippingTotal,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod,
    isSplitShipment,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}