import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import {
  eventIdempotencyKey,
  isTimestampStale,
  MAX_TIMESTAMP_DRIFT_SECONDS,
  verifyWebhookSignature,
} from '../src/lib/orders/webhook-security.ts';

const SECRET = 'whsec_test_secret';

function sign(body: string, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

describe('webhook signature verification', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'payment.succeeded', data: { orderId: 'ord_1' } });

  it('accepts a correctly signed payload', () => {
    assert.equal(verifyWebhookSignature(body, sign(body), SECRET), true);
  });

  it('accepts the sha256= prefixed form', () => {
    assert.equal(verifyWebhookSignature(body, `sha256=${sign(body)}`, SECRET), true);
  });

  it('rejects a signature made with a different secret', () => {
    assert.equal(verifyWebhookSignature(body, sign(body, 'wrong_secret'), SECRET), false);
  });

  it('rejects a tampered body', () => {
    const tampered = body.replace('ord_1', 'ord_2');
    assert.equal(verifyWebhookSignature(tampered, sign(body), SECRET), false);
  });

  it('rejects a missing or empty signature', () => {
    assert.equal(verifyWebhookSignature(body, '', SECRET), false);
  });

  it('rejects a non-hex signature without throwing', () => {
    assert.equal(verifyWebhookSignature(body, 'not-a-hex-signature', SECRET), false);
  });

  it('rejects a truncated signature (length mismatch)', () => {
    assert.equal(verifyWebhookSignature(body, sign(body).slice(0, 20), SECRET), false);
  });
});

describe('webhook replay window', () => {
  const now = 1_700_000_000;

  it('accepts a timestamp inside the window', () => {
    assert.equal(isTimestampStale(now - 60, now), false);
  });

  it('accepts a timestamp exactly at the boundary', () => {
    assert.equal(isTimestampStale(now - MAX_TIMESTAMP_DRIFT_SECONDS, now), false);
  });

  it('rejects an old timestamp', () => {
    assert.equal(isTimestampStale(now - MAX_TIMESTAMP_DRIFT_SECONDS - 1, now), true);
  });

  it('rejects a far-future timestamp', () => {
    assert.equal(isTimestampStale(now + 3600, now), true);
  });
});

describe('webhook idempotency', () => {
  it('uses the provider event id when present', () => {
    assert.equal(eventIdempotencyKey('evt_123', 'payment.succeeded', 'ord_1'), 'evt_123');
  });

  it('falls back to type plus order when the id is missing', () => {
    assert.equal(
      eventIdempotencyKey(undefined, 'payment.succeeded', 'ord_1'),
      'payment.succeeded:ord_1',
    );
  });
});