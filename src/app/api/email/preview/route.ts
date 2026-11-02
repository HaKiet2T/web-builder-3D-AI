import { NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { ReceiptEmail } from '@/emails/ReceiptEmail';

export async function GET() {
  try {
    const emailHtml = await render(ReceiptEmail({}));
    return new NextResponse(emailHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[Email Preview Error]:', error);
    return NextResponse.json(
      { ok: false, error: 'Không thể tạo bản xem trước email' },
      { status: 500 }
    );
  }
}
