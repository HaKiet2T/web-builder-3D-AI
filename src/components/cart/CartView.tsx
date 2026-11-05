'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cartSubtotal, useCartHydrated, useCartStore } from '@/store/cart';
import type { CartTotals, CartValidationIssue } from '@/lib/catalog/types';

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

const EMPTY_TOTALS: CartTotals = {
  subtotal: 0,
  shippingTotal: 0,
  discountTotal: 0,
  total: 0,
};

/**
 * Cart contents.
 *
 * The client total is only an estimate shown while the server response is in
 * flight. As soon as `/api/cart/validate` answers, the authoritative totals and
 * any price/stock changes replace it.
 */
export function CartView() {
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const replaceItems = useCartStore((state) => state.replaceItems);
  const hydrated = useCartHydrated();

  // Keyed by the exact cart contents, so the effect only refetches when the
  // lines or quantities actually change.
  const linesKey = useMemo(
    () => items.map((item) => `${item.variantId}:${item.quantity}`).join('|'),
    [items],
  );

  const [response, setResponse] = useState<{
    key: string;
    totals: CartTotals;
    issues: CartValidationIssue[];
    failed: boolean;
    items: typeof items;
  } | null>(null);

  const requestId = useRef(0);

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) return;

    const id = ++requestId.current;

    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        lines: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      }),
    })
      .then(async (result) => {
        if (!result.ok) throw new Error('Cart validation failed');
        return (await result.json()) as {
          totals: CartTotals;
          issues: CartValidationIssue[];
          items: typeof items;
        };
      })
      .then((data) => {
        if (id !== requestId.current) return;
        setResponse({
          key: linesKey,
          totals: data.totals,
          issues: data.issues,
          failed: false,
          items: data.items,
        });
        // Drop lines the server no longer recognises so the UI cannot offer
        // checkout for products that vanished from the catalogue.
        if (data.items.length !== items.length) replaceItems(data.items);
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setResponse({
          key: linesKey,
          totals: EMPTY_TOTALS,
          issues: [],
          failed: true,
          items,
        });
      });
  }, [linesKey, hydrated, items, replaceItems]);

  if (!hydrated) {
    return (
      <p className="cart-loading" aria-busy="true">
        Đang tải giỏ hàng…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <section className="home-hero" aria-labelledby="cart-title">
        <h1 id="cart-title">Giỏ hàng</h1>
        <p className="home-intro">Chưa có sản phẩm nào trong giỏ hàng.</p>
        <p className="page-empty">
          Giỏ hàng dùng chung cho cả năm nhóm thiết bị.{' '}
          <Link className="page-inline-link" href="/monitor">
            Xem bộ sưu tập màn hình ROG
          </Link>{' '}
          hoặc{' '}
          <Link className="page-inline-link" href="/">
            chọn nhóm thiết bị khác
          </Link>
          .
        </p>
      </section>
    );
  }

  const estimate = cartSubtotal(items);
  // Only trust a response that belongs to the cart currently on screen.
  const current = response && response.key === linesKey ? response : null;
  const totals = current?.totals ?? null;
  const issues = current?.issues ?? [];
  const status: 'loading' | 'ready' | 'error' = !current
    ? 'loading'
    : current.failed
      ? 'error'
      : 'ready';

  return (
    <section aria-labelledby="cart-title">
      <header className="cart-header">
        <h1 id="cart-title">Giỏ hàng</h1>
        <p className="home-intro">{items.length} dòng sản phẩm.</p>
      </header>

      {issues.length > 0 ? (
        <ul className="cart-issues" role="alert">
          {issues.map((issue) => (
            <li key={`${issue.code}-${issue.variantId}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}

      <ul className="cart-lines">
        {items.map((item) => (
          <li key={item.variantId} className="cart-line">
            <span className="cart-line-media" aria-hidden="true">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="cart-line-placeholder" />
              )}
            </span>

            <span className="cart-line-body">
              <span className="cart-line-name">{item.name}</span>
              <span className="cart-line-variant">{item.variantName}</span>
              {item.stockStatus === 'preorder' ? (
                <span className="cart-line-note">Đặt trước · giao sau 14–21 ngày</span>
              ) : null}
            </span>

            <span className="cart-line-quantity">
              <label>
                <span className="sr-only">Số lượng {item.name}</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={item.quantity}
                  onChange={(event) =>
                    setQuantity(item.variantId, Number(event.currentTarget.value))
                  }
                />
              </label>
            </span>

            <span className="cart-line-price">{formatPrice(item.unitPrice * item.quantity)}</span>

            <button
              className="cart-line-remove"
              type="button"
              onClick={() => removeItem(item.variantId)}
            >
              Xoá<span className="sr-only"> {item.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="cart-summary">
        <p className="cart-summary-note" aria-live="polite">
          {status === 'loading'
            ? 'Đang kiểm tra giá và tồn kho…'
            : status === 'error'
              ? 'Không kiểm tra được giá từ máy chủ. Tổng dưới đây chỉ là tạm tính.'
              : 'Giá và tồn kho đã được máy chủ xác nhận.'}
        </p>

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

        <Link className="cart-checkout-link" href="/checkout">
          Tiến hành thanh toán
        </Link>
      </div>
    </section>
  );
}