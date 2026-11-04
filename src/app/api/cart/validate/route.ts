import { NextResponse } from 'next/server';
import { z } from 'zod';
import { priceCart } from '@/lib/cart/server';

const CartPayloadSchema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive().max(999),
        unitPrice: z.number().nonnegative().optional(),
      }),
    )
    .max(100),
});

/**
 * Re-prices a cart on the server.
 *
 * The request carries variant ids and quantities only. Any price the client
 * believes it has is used solely to raise a "price changed" notice; the
 * response is the authoritative total.
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
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const result = await priceCart(parsed.data.lines);

  return NextResponse.json({
    ok: true,
    items: result.items,
    totals: result.totals,
    issues: result.issues,
  });
}