import { NextResponse } from 'next/server';
import { priceCart } from '@/lib/cart/server';
import { CartPayloadSchema } from '@/lib/cart/schema';

export { CartPayloadSchema };

/**
 * Re-prices a cart on the server.
 *
 * The request carries variant ids and quantities under either `items` (canonical)
 * or `lines` (legacy). Any price the client believes it has is used solely to raise
 * a "price changed" notice; the response is the authoritative total.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON không hợp lệ' }, { status: 400 });
  }

  const parsed = CartPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Dữ liệu giỏ hàng không hợp lệ',
        issues: parsed.error.issues.map((issue) => ({
          code: 'validation_error',
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const result = await priceCart(parsed.data.items);

  return NextResponse.json({
    ok: true,
    items: result.items,
    totals: result.totals,
    issues: result.issues,
  });
}