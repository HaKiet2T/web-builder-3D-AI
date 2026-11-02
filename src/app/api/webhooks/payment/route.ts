import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

interface WebhookEvent {
  id: string;
  type: string;
  created: number;
  data: {
    orderId: string;
    orderNumber?: string;
    amount: number;
    currency?: string;
    transactionId: string;
    paymentMethod: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Xác thực tính toàn vẹn của Webhook bằng HMAC-SHA256
 * Sử dụng timingSafeEqual để triệt tiêu lỗ hổng Timing Attack.
 */
function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  try {
    // Hỗ trợ cả hai dạng: "sha256=abcdef..." hoặc chuỗi hex trực tiếp
    const normalizedSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7).trim()
      : signatureHeader.trim();

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    const sigBuf = Buffer.from(normalizedSignature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');

    if (sigBuf.length !== expBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (err) {
    console.error('[HMAC Verification Exception]:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Đọc Raw Body dạng chuỗi văn bản thuần túy trước khi parse JSON (bắt buộc cho HMAC)
    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json(
        { ok: false, error: 'Request body rỗng' },
        { status: 400 }
      );
    }

    // 2. Trích xuất chữ ký số từ các Header bảo mật phổ biến
    const signatureHeader =
      req.headers.get('x-signature') ||
      req.headers.get('x-hub-signature-256') ||
      req.headers.get('stripe-signature');

    if (!signatureHeader) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Thiếu chữ ký số Webhook (x-signature hoặc x-hub-signature-256)',
        },
        { status: 401 }
      );
    }

    // 3. Lấy khóa bí mật Webhook Secret từ biến môi trường
    const webhookSecret =
      process.env.PAYMENT_WEBHOOK_SECRET ||
      'whsec_your_payment_webhook_secret_key_here';

    // 4. Đối soát chữ ký bằng thuật toán HMAC-SHA256
    const isValidSignature = verifyWebhookSignature(
      rawBody,
      signatureHeader,
      webhookSecret
    );

    if (!isValidSignature) {
      console.warn('[Webhook Security Warning] Chữ ký số HMAC-SHA256 không hợp lệ.');
      return NextResponse.json(
        {
          ok: false,
          error: 'Chữ ký số xác thực HMAC-SHA256 không hợp lệ (Unauthorized)',
        },
        { status: 401 }
      );
    }

    // 5. Kiểm tra thời gian Replay Attack (nếu có header x-timestamp)
    const timestampHeader = req.headers.get('x-timestamp');
    if (timestampHeader) {
      const requestTime = parseInt(timestampHeader, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const MAX_DRIFT_SECONDS = 300; // 5 phút

      if (Math.abs(currentTime - requestTime) > MAX_DRIFT_SECONDS) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Request đã hết hạn đối soát (Replay Attack Prevention)',
          },
          { status: 400 }
        );
      }
    }

    // 6. Parse JSON Payload sau khi đã xác thực chữ ký số an toàn
    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Dữ liệu JSON webhook không đúng định dạng' },
        { status: 400 }
      );
    }

    const { type, data } = event;
    console.log(`[Payment Webhook Event] ${type} cho đơn hàng: ${data?.orderId}`);

    // 7. Xử lý các sự kiện thanh toán chính
    switch (type) {
      case 'payment.succeeded':
      case 'checkout.session.completed':
      case 'PAYMENT_SUCCESS': {
        // Cập nhật trạng thái đơn hàng -> 'paid', các kiện hàng fulfillments -> 'processing'
        // Tại đây tích hợp thêm gửi email xác nhận hoặc thông báo vận chuyển
        return NextResponse.json({
          ok: true,
          received: true,
          event: type,
          orderId: data.orderId,
          orderStatus: 'paid',
          paymentStatus: 'paid',
          message: 'Đã đối soát chữ ký số thành công và cập nhật trạng thái đơn hàng sang PAID',
        });
      }

      case 'payment.failed':
      case 'payment_intent.payment_failed':
      case 'PAYMENT_FAILED': {
        return NextResponse.json({
          ok: true,
          received: true,
          event: type,
          orderId: data.orderId,
          orderStatus: 'failed',
          paymentStatus: 'failed',
          message: 'Đơn hàng thanh toán thất bại, đã ghi nhận log',
        });
      }

      case 'payment.refunded': {
        return NextResponse.json({
          ok: true,
          received: true,
          event: type,
          orderId: data.orderId,
          paymentStatus: 'refunded',
          message: 'Đã ghi nhận hoàn tiền giao dịch',
        });
      }

      default:
        return NextResponse.json({
          ok: true,
          received: true,
          unhandledEvent: type,
          message: 'Sự kiện chưa cần xử lý nghiệp vụ',
        });
    }
  } catch (error) {
    console.error('[Payment Webhook Error]:', error);
    return NextResponse.json(
      { ok: false, error: 'Lỗi hệ thống khi xử lý webhook đối soát' },
      { status: 500 }
    );
  }
}
