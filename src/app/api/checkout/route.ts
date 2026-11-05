import { NextResponse } from 'next/server';
import { priceCart } from '@/lib/cart/server';
import { CheckoutPayloadSchema } from '@/lib/cart/schema';
import { buildOrder } from '@/lib/orders/build-order';
import { OrderPersistenceError, persistCheckoutOrder } from '@/lib/orders/dal';

export { CheckoutPayloadSchema };

/**
 * Checkout.
 *
 * The client only sends variant ids, quantities and customer details under
 * either `items` (canonical) or `lines` (legacy). Every price, name and stock status
 * is looked up server-side through the catalogue DAL, so the request body
 * cannot influence the amount charged.
 */

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON không hợp lệ' }, { status: 400 });
  }

  const parsed = CheckoutPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Dữ liệu đơn hàng không hợp lệ',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const { customer, items, paymentMethod } = parsed.data;

  // 1. Price the cart from the catalogue, not from what the client claimed.
  const priced = await priceCart(items);

  if (priced.items.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Không có sản phẩm nào còn mua được trong giỏ hàng',
        issues: priced.issues,
      },
      { status: 409 },
    );
  }

  // 2. Build the order from server-priced lines, splitting when needed.
  const order = buildOrder({
    items: priced.items,
    customer,
    paymentMethod,
  });

  let persisted: boolean;
  try {
    persisted = await persistCheckoutOrder(order);
  } catch (error) {
    if (!(error instanceof OrderPersistenceError)) throw error;
    console.error('[Checkout] Order persistence failed:', error.message);
    return NextResponse.json(
      { ok: false, error: 'Không thể lưu đơn hàng. Vui lòng thử lại sau.' },
      { status: 503 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json(
    {
      ok: true,
      message: !persisted
        ? 'Đơn hàng xem trước chưa được lưu vì cửa hàng đang chạy bằng dữ liệu mẫu.'
        : order.isSplitShipment
          ? 'Đã tạo đơn hàng và tách thành hai kiện: giao ngay và đặt trước'
          : 'Đã tạo đơn hàng thành công',
      order,
      persisted,
      issues: priced.issues,
      paymentUrl:
        paymentMethod === 'cod'
          ? null
          : `${appUrl}/checkout/payment?orderId=${order.id}&amount=${order.totalAmount}`,
    },
    { status: 201 },
  );
}