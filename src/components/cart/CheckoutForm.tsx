'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import { cartSubtotal, useCartHydrated, useCartStore } from '@/store/cart';
import type { CartTotals, CartValidationIssue } from '@/lib/catalog/types';
import type { Order } from '@/types/order';

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; message: string; issues: CartValidationIssue[] }
  | { status: 'done'; order: Order; persisted: boolean };

const PAYMENT_METHODS = [
  { value: 'cod', label: 'Thanh toán khi nhận hàng' },
  { value: 'stripe', label: 'Thẻ quốc tế' },
  { value: 'vnpay', label: 'VNPay' },
  { value: 'momo', label: 'MoMo' },
] as const;

export function CheckoutForm() {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const hydrated = useCartHydrated();

  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]['value']>('cod');
  const [state, setState] = useState<SubmitState>({ status: 'idle' });
  const formId = useId();

  // Server-verified total for the cart as it currently stands.
  const linesKey = useMemo(
    () => items.map((item) => `${item.variantId}:${item.quantity}`).join('|'),
    [items],
  );
  const [quote, setQuote] = useState<{ key: string; totals: CartTotals } | null>(null);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;

    let cancelled = false;
    const key = linesKey;

    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        lines: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('validate'))))
      .then((data: { totals: CartTotals }) => {
        if (cancelled) return;
        setQuote({ key, totals: data.totals });
      })
      .catch(() => {
        // Totals fall back to the client estimate; the server still wins at submit.
      });

    return () => {
      cancelled = true;
    };
  }, [linesKey, hydrated, items]);

  const totals = quote && quote.key === linesKey ? quote.totals : null;

  if (!hydrated) {
    return (
      <p className="cart-loading" aria-busy="true">
        Đang tải…
      </p>
    );
  }

  if (state.status === 'done') {
    const { order, persisted } = state;
    return (
      <section className="checkout-done" aria-labelledby="checkout-done-title">
        <h1 id="checkout-done-title">Đã đặt hàng</h1>
        {!persisted ? (
          <p className="checkout-error" role="status">
            Đơn hàng này chỉ là bản xem trước và chưa được lưu. Cấu hình Supabase để bật đặt hàng thật.
          </p>
        ) : null}
        <p className="home-intro">
          Mã đơn <strong>{order.orderNumber}</strong>. Tổng{' '}
          {formatPrice(order.totalAmount)}.
        </p>
        {order.isSplitShipment ? (
          <p className="cart-summary-note">
            Đơn của bạn được tách thành {order.fulfillments.length} kiện hàng.
          </p>
        ) : null}
        <ul className="checkout-fulfillments">
          {order.fulfillments.map((fulfillment) => (
            <li key={fulfillment.id}>
              <strong>{fulfillment.type === 'preorder' ? 'Đặt trước' : 'Giao ngay'}</strong>
              {' · '}
              {fulfillment.items.length} sản phẩm · {fulfillment.estimatedDelivery}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <Link
            className="add-to-cart-button"
            href={`/orders/${order.id}`}
            style={{ textDecoration: 'none', display: 'inline-block', width: 'auto', padding: '0.75rem 1.25rem' }}
          >
            Theo dõi đơn hàng thời gian thực →
          </Link>
          <Link className="page-inline-link" href="/" style={{ alignSelf: 'center' }}>
            Tiếp tục chọn thiết bị
          </Link>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="home-hero" aria-labelledby="checkout-title">
        <h1 id="checkout-title">Thanh toán</h1>
        <p className="home-intro">Giỏ hàng đang trống.</p>
        <p className="page-empty">
          <Link className="page-inline-link" href="/monitor">
            Xem bộ sưu tập màn hình
          </Link>{' '}
          để thêm sản phẩm.
        </p>
      </section>
    );
  }

  const estimate = cartSubtotal(items);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setState({ status: 'submitting' });

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          customer: {
            fullName: String(data.get('fullName') ?? ''),
            email: String(data.get('email') ?? ''),
            phone: String(data.get('phone') ?? ''),
            address: String(data.get('address') ?? ''),
            city: String(data.get('city') ?? ''),
            postalCode: String(data.get('postalCode') ?? '') || undefined,
            notes: String(data.get('notes') ?? '') || undefined,
          },
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      const body = await response.json();

      if (!response.ok || !body?.ok) {
        setState({
          status: 'error',
          message: body?.error ?? 'Không thể tạo đơn hàng. Vui lòng thử lại.',
          issues: body?.issues ?? [],
        });
        return;
      }

      clearCart();
      setState({
        status: 'done',
        order: body.order as Order,
        persisted: body.persisted === true,
      });
    } catch {
      setState({
        status: 'error',
        message: 'Không kết nối được máy chủ. Vui lòng thử lại.',
        issues: [],
      });
    }
  }

  return (
    <section aria-labelledby="checkout-title">
      <header className="cart-header">
        <h1 id="checkout-title">Thanh toán</h1>
        <p className="home-intro">
          {items.length} dòng · tổng {formatPrice(totals?.total ?? estimate)}
        </p>
      </header>

      {state.status === 'error' ? (
        <div className="checkout-error" role="alert">
          <p>{state.message}</p>
          {state.issues.length > 0 ? (
            <ul>
              {state.issues.map((issue) => (
                <li key={`${issue.code}-${issue.variantId}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <form className="checkout-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Thông tin giao hàng</legend>

          <label htmlFor={`${formId}-name`}>Họ và tên</label>
          <input id={`${formId}-name`} name="fullName" required autoComplete="name" />

          <label htmlFor={`${formId}-email`}>Email</label>
          <input id={`${formId}-email`} name="email" type="email" required autoComplete="email" />

          <label htmlFor={`${formId}-phone`}>Số điện thoại</label>
          <input id={`${formId}-phone`} name="phone" required autoComplete="tel" />

          <label htmlFor={`${formId}-address`}>Địa chỉ</label>
          <input id={`${formId}-address`} name="address" required autoComplete="street-address" />

          <label htmlFor={`${formId}-city`}>Tỉnh / Thành phố</label>
          <input id={`${formId}-city`} name="city" required autoComplete="address-level2" />

          <label htmlFor={`${formId}-postal`}>Mã bưu chính (không bắt buộc)</label>
          <input id={`${formId}-postal`} name="postalCode" autoComplete="postal-code" />

          <label htmlFor={`${formId}-notes`}>Ghi chú (không bắt buộc)</label>
          <textarea id={`${formId}-notes`} name="notes" rows={3} />
        </fieldset>

        <fieldset>
          <legend>Phương thức thanh toán</legend>
          {PAYMENT_METHODS.map((method) => (
            <label key={method.value} className="checkout-payment-option">
              <input
                type="radio"
                name="paymentMethod"
                value={method.value}
                checked={paymentMethod === method.value}
                onChange={() => setPaymentMethod(method.value)}
              />
              <span>{method.label}</span>
            </label>
          ))}
        </fieldset>

        <dl className="cart-totals">
          <div>
            <dt>Tạm tính</dt>
            <dd>{formatPrice(totals?.subtotal ?? estimate)}</dd>
          </div>
          <div>
            <dt>Vận chuyển</dt>
            <dd>
              {totals
                ? totals.shippingTotal === 0
                  ? 'Miễn phí'
                  : formatPrice(totals.shippingTotal)
                : '—'}
            </dd>
          </div>
          <div className="cart-total-row">
            <dt>Tổng cộng</dt>
            <dd>{formatPrice(totals?.total ?? estimate)}</dd>
          </div>
        </dl>

        <button className="add-to-cart-button" type="submit" disabled={state.status === 'submitting'}>
          {state.status === 'submitting' ? 'Đang xử lý…' : 'Đặt hàng'}
        </button>
      </form>
    </section>
  );
}