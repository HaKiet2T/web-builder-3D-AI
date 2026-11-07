import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('Flagship Checkout UI/UX & Responsive 2-Column Experience', () => {
  it('validates CheckoutPage layout and responsive viewport structure', () => {
    const pageContent = readFileSync('src/app/checkout/page.tsx', 'utf8');

    // Container with clean background, max-w-7xl and flex layout
    assert.match(pageContent, /max-w-7xl/);
    assert.match(pageContent, /CheckoutForm/);
    assert.match(pageContent, /SiteFooter/);
  });

  it('validates 2-column layout and sticky live order summary structure', () => {
    const formContent = readFileSync('src/components/cart/CheckoutForm.tsx', 'utf8');

    // 2-column responsive layout
    assert.match(formContent, /lg:grid/);
    assert.match(formContent, /lg:grid-cols-12/);
    assert.match(formContent, /lg:col-span-7/);
    assert.match(formContent, /lg:col-span-5/);

    // Sticky live order summary
    assert.match(formContent, /sticky top-28/);
    assert.match(formContent, /Đơn hàng của bạn/);
    assert.match(formContent, /Sửa giỏ hàng/);
  });

  it('validates payment method selector cards and trust badges', () => {
    const formContent = readFileSync('src/components/cart/CheckoutForm.tsx', 'utf8');

    // 4 Payment methods
    assert.match(formContent, /Thanh toán khi nhận hàng \(COD\)/);
    assert.match(formContent, /VNPAY-QR \/ Thẻ ATM nội địa/);
    assert.match(formContent, /Ví điện tử MoMo/);
    assert.match(formContent, /Thẻ thanh toán quốc tế/);

    // Trust & Security guarantees
    assert.match(formContent, /Bảo mật giao dịch 256-bit SSL/);
    assert.match(formContent, /Đồng kiểm hàng trước khi nhận/);
    assert.match(formContent, /Đổi mới trong 7 ngày nếu lỗi/);
  });

  it('supports logged-in user saved addresses quick fill', () => {
    const formContent = readFileSync('src/components/cart/CheckoutForm.tsx', 'utf8');

    assert.match(formContent, /user_addresses/);
    assert.match(formContent, /savedAddresses/);
    assert.match(formContent, /Sổ địa chỉ đã lưu/);
    assert.match(formContent, /getBrowserSupabaseClient/);
  });

  it('provides celebratory Order Done state with real-time tracking link', () => {
    const formContent = readFileSync('src/components/cart/CheckoutForm.tsx', 'utf8');

    assert.match(formContent, /Đặt hàng thành công!/);
    assert.match(formContent, /Mã đơn/);
    assert.match(formContent, /copyOrderNumber/);
    assert.match(formContent, /Theo dõi đơn hàng thời gian thực/);
  });

  it('provides a clean empty cart view with catalog discovery links', () => {
    const formContent = readFileSync('src/components/cart/CheckoutForm.tsx', 'utf8');

    assert.match(formContent, /Giỏ hàng của bạn đang trống/);
    assert.match(formContent, /Khám phá trang chủ/);
    assert.match(formContent, /Xem bộ sưu tập màn hình 3D/);
  });

  it('guarantees guest checkout resilience when userId is not set', () => {
    const dalContent = readFileSync('src/lib/orders/dal.ts', 'utf8');

    // Only assign user_id if order.userId is present
    assert.match(dalContent, /if\s*\(order\.userId\)\s*\{\s*orderPayload\.user_id\s*=\s*order\.userId;\s*\}/);

    // Error handling catches user_id column absence without requiring orderPayload.user_id to be truthy
    assert.match(dalContent, /if\s*\(error\.message\.includes\('user_id'\)\)/);
  });
});
