import crypto from 'node:crypto';

/**
 * Payment webhook security.
 *
 * Extracted from the route handler so the signature and replay rules can be
 * tested directly. Kept free of Next.js imports.
 */

/** Reject events whose timestamp is further than this from now. */
export const MAX_TIMESTAMP_DRIFT_SECONDS = 300;

/**
 * Verify an HMAC-SHA256 signature over the raw request body.
 *
 * Accepts both `sha256=<hex>` and a bare `<hex>` signature. Comparison uses
 * `timingSafeEqual` so a wrong signature cannot be recovered byte-by-byte.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  try {
    const normalized = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7).trim()
      : signatureHeader.trim();

    const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

    const providedBuffer = Buffer.from(normalized, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    // A malformed hex string still produces a buffer, so compare lengths first.
    if (providedBuffer.length !== expectedBuffer.length) return false;

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/** True when the timestamp header is present and too old/new to trust. */
export function isTimestampStale(timestampSeconds: number, nowSeconds: number): boolean {
  return Math.abs(nowSeconds - timestampSeconds) > MAX_TIMESTAMP_DRIFT_SECONDS;
}

/** Stable idempotency key for an event, so retries cannot double-apply. */
export function eventIdempotencyKey(eventId: string | undefined, type: string, orderId: string) {
  return eventId ? `${eventId}` : `${type}:${orderId}`;
}