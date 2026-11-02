import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Order, OrderItem, Fulfillment } from '@/types/order';

// Validation Schema using Zod
const CheckoutItemSchema = z.object({
  productId: z.string().min(1, 'Mã sản phẩm không được để trống'),
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  variant: z.string().default('graphite'),
  price: z.number().nonnegative('Giá sản phẩm phải lớn hơn hoặc bằng 0'),
  quantity: z.number().int().positive('Số lượng sản phẩm phải lớn hơn 0'),
  stockStatus: z.enum(['in-stock', 'preorder']),
});

const CustomerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().regex(/^[0-9+() -]{9,15}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(5, 'Địa chỉ giao hàng quá ngắn'),
  city: z.string().min(2, 'Tỉnh/Thành phố không hợp lệ'),
  postalCode: z.string().optional(),
  notes: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

const CheckoutPayloadSchema = z.object({
  customer: CustomerSchema,
  items: z.array(CheckoutItemSchema).min(1, 'Giỏ hàng không được để trống'),
  paymentMethod: z.enum(['stripe', 'vnpay', 'momo', 'cod']).default('stripe'),
});

// Shipping constants (VND)
const BASE_PACKAGE_SHIPPING_FEE = 35_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate payload with Zod
    const validationResult = CheckoutPayloadSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Dữ liệu đơn hàng không hợp lệ',
          issues: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { customer, items, paymentMethod } = validationResult.data;

    // 2. Identify in-stock vs preorder items for Split Shipment logic
    const inStockItems = items.filter((item) => item.stockStatus === 'in-stock');
    const preorderItems = items.filter((item) => item.stockStatus === 'preorder');

    const hasInStock = inStockItems.length > 0;
    const hasPreorder = preorderItems.length > 0;
    const isSplitShipment = hasInStock && hasPreorder;

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const orderNumber = `ORD-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
    const nowIso = new Date().toISOString();

    // 3. Construct Order Items with UUIDs
    let itemCounter = 1;
    const orderItems: OrderItem[] = items.map((item) => ({
      id: `${orderId}_item_${itemCounter++}`,
      productId: item.productId,
      name: item.name,
      variant: item.variant,
      price: item.price,
      quantity: item.quantity,
      stockStatus: item.stockStatus,
    }));

    // 4. Calculate Subtotal
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // 5. Construct Fulfillments & Calculate Dual Shipping Fee if Split
    const fulfillments: Fulfillment[] = [];
    let shippingTotal = 0;

    if (isSplitShipment) {
      // Kiện 1: Giao ngay cho hàng có sẵn
      const inStockOrderItems = orderItems.filter((i) => i.stockStatus === 'in-stock');
      const inStockFulfillmentId = `${orderId}_ful_instock`;
      inStockOrderItems.forEach((i) => {
        i.fulfillmentId = inStockFulfillmentId;
      });

      fulfillments.push({
        id: inStockFulfillmentId,
        orderId,
        type: 'in-stock',
        status: 'pending',
        items: inStockOrderItems,
        shippingFee: BASE_PACKAGE_SHIPPING_FEE,
        estimatedDelivery: '2 - 4 ngày làm việc (Giao ngay)',
        createdAt: nowIso,
      });

      // Kiện 2: Giao sau cho hàng đặt trước (Pre-order)
      const preorderOrderItems = orderItems.filter((i) => i.stockStatus === 'preorder');
      const preorderFulfillmentId = `${orderId}_ful_preorder`;
      preorderOrderItems.forEach((i) => {
        i.fulfillmentId = preorderFulfillmentId;
      });

      fulfillments.push({
        id: preorderFulfillmentId,
        orderId,
        type: 'preorder',
        status: 'pending',
        items: preorderOrderItems,
        shippingFee: BASE_PACKAGE_SHIPPING_FEE,
        estimatedDelivery: '14 - 21 ngày làm việc (Đợt hàng xuất xưởng)',
        createdAt: nowIso,
      });

      // Phí ship kép cho 2 kiện hàng riêng biệt
      shippingTotal = BASE_PACKAGE_SHIPPING_FEE * 2;
    } else {
      // Đơn hàng đơn nhất (toàn bộ in-stock hoặc toàn bộ preorder)
      const singleFulfillmentId = `${orderId}_ful_main`;
      orderItems.forEach((i) => {
        i.fulfillmentId = singleFulfillmentId;
      });

      const singleType = hasPreorder ? 'preorder' : 'in-stock';
      fulfillments.push({
        id: singleFulfillmentId,
        orderId,
        type: singleType,
        status: 'pending',
        items: orderItems,
        shippingFee: BASE_PACKAGE_SHIPPING_FEE,
        estimatedDelivery: hasPreorder
          ? '14 - 21 ngày làm việc'
          : '2 - 4 ngày làm việc',
        createdAt: nowIso,
      });

      shippingTotal = BASE_PACKAGE_SHIPPING_FEE;
    }

    const totalAmount = subtotal + shippingTotal;

    // 6. Build Master Order Object
    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customer,
      items: orderItems,
      fulfillments,
      subtotal,
      shippingTotal,
      discountTotal: 0,
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod,
      isSplitShipment,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 7. Mock Payment Gateway Session URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${appUrl}/checkout/payment?orderId=${orderId}&amount=${totalAmount}`;

    return NextResponse.json(
      {
        ok: true,
        message: isSplitShipment
          ? 'Đã tạo đơn hàng thành công kèm cấu hình Tách đơn (Split Shipment) và tính phí ship kép'
          : 'Đã tạo đơn hàng tiêu chuẩn thành công',
        order: newOrder,
        paymentUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Checkout Error]:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Lỗi máy chủ nội bộ trong quá trình xử lý checkout',
      },
      { status: 500 }
    );
  }
}
