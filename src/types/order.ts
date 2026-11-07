// Type definitions for Orders and Fulfillment with Split Shipment support

export type FulfillmentStatus =
  | 'pending'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'cancelled'
  | 'failed';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded';

export type StockStatus = 'in-stock' | 'preorder';

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  stockStatus: StockStatus;
  fulfillmentId?: string;
}

export interface Fulfillment {
  id: string;
  orderId: string;
  type: 'in-stock' | 'preorder';
  status: FulfillmentStatus;
  trackingNumber?: string;
  carrier?: string;
  items: OrderItem[];
  shippingFee: number;
  estimatedDelivery: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customer: CustomerInfo;
  items: OrderItem[];
  fulfillments: Fulfillment[];
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  paymentTransactionId?: string;
  isSplitShipment: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  userId?: string;
  customer: CustomerInfo;
  items: Omit<OrderItem, 'id' | 'fulfillmentId'>[];
  paymentMethod: string;
}

export interface CheckoutResult {
  order: Order;
  paymentUrl?: string;
  clientSecret?: string;
}
