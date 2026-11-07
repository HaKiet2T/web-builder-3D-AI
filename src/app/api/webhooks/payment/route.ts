import { NextResponse } from 'next/server';
import { applyPaymentWebhookUpdate } from '@/lib/orders/dal';
import {
  eventIdempotencyKey,
  isTimestampStale,
  verifyWebhookSignature,
} from '@/lib/orders/webhook-security';

interface WebhookEvent {
  id?: string;
  type: string;
  created?: number;
  data: {
    orderId: string;
    orderNumber?: string;
    amount?: number;
    currency?: string;
    transactionId?: string;
    paymentMethod?: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Payment provider webhook.
 *
 * Order: read the raw body, verify the signature, check freshness, then parse.
 * The secret has no fallback value — an unconfigured deployment must reject
 * events rather than accept anything signed with a guessable default.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Payment Webhook] PAYMENT_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { ok: false, error: 'Webhook chưa được cấu hình' },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json({ ok: false, error: 'Request body rỗng' }, { status: 400 });
  }

  const signature =
    request.headers.get('x-signature') ??
    request.headers.get('x-hub-signature-256') ??
    request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { ok: false, error: 'Thiếu chữ ký số webhook' },
      { status: 401 },
    );
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { ok: false, error: 'Chữ ký số không hợp lệ' },
      { status: 401 },
    );
  }

  const timestampHeader = request.headers.get('x-timestamp');
  if (timestampHeader) {
    const requestTime = Number.parseInt(timestampHeader, 10);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(requestTime) || isTimestampStale(requestTime, now)) {
      return NextResponse.json(
        { ok: false, error: 'Request đã hết hạn đối soát' },
        { status: 400 },
      );
    }
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Dữ liệu JSON webhook không đúng định dạng' },
      { status: 400 },
    );
  }

  if (!event?.type || !event?.data?.orderId) {
    return NextResponse.json(
      { ok: false, error: 'Thiếu trường bắt buộc trong webhook' },
      { status: 400 },
    );
  }

  const orderId = event.data.orderId;

  switch (event.type) {
    case 'payment.succeeded':
    case 'checkout.session.completed':
    case 'PAYMENT_SUCCESS': {
      await applyPaymentWebhookUpdate({
        orderId,
        status: 'paid',
        paymentStatus: 'paid',
        transactionId: event.data.transactionId,
      });
      return NextResponse.json({
        ok: true,
        received: true,
        event: event.type,
        idempotencyKey: eventIdempotencyKey(event.id, event.type, orderId),
        orderId,
        orderStatus: 'paid',
        paymentStatus: 'paid',
      });
    }

    case 'payment.failed':
    case 'payment_intent.payment_failed':
    case 'PAYMENT_FAILED': {
      await applyPaymentWebhookUpdate({
        orderId,
        status: 'failed',
        paymentStatus: 'failed',
        transactionId: event.data.transactionId,
      });
      return NextResponse.json({
        ok: true,
        received: true,
        event: event.type,
        idempotencyKey: eventIdempotencyKey(event.id, event.type, orderId),
        orderId,
        orderStatus: 'failed',
        paymentStatus: 'failed',
      });
    }

    case 'payment.refunded': {
      await applyPaymentWebhookUpdate({
        orderId,
        paymentStatus: 'refunded',
        transactionId: event.data.transactionId,
      });
      return NextResponse.json({
        ok: true,
        received: true,
        event: event.type,
        idempotencyKey: eventIdempotencyKey(event.id, event.type, orderId),
        orderId,
        paymentStatus: 'refunded',
      });
    }

    default:
      return NextResponse.json({
        ok: true,
        received: true,
        unhandledEvent: event.type,
      });
  }
}