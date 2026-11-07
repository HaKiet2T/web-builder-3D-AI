'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cartCount, cartSubtotal, useCartHydrated, useCartStore } from '@/store/cart';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/cart/pricing';
import { useTheme } from '@/components/theme/ThemeProvider';

function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor">
      <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor">
      <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor">
      <path d="M5 12h14M13 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CartDrawer() {
  const router = useRouter();
  const titleId = useId();
  const hydrated = useCartHydrated();
  const { theme } = useTheme();

  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [discountCode, setDiscountCode] = useState('');
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);

  const totalCount = cartCount(items);
  const subtotal = cartSubtotal(items);
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const progressPercent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  // Lock body scroll when cart drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCart]);

  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountCode.trim()) return;
    setDiscountMessage(`Mã "${discountCode.trim()}" sẽ được áp dụng tại bước thanh toán.`);
  };

  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  if (!hydrated) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition-visibility duration-300 ${
        isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside
        data-theme={theme}
        className={`fixed top-0 right-0 bottom-0 h-full w-full sm:max-w-[460px] bg-white dark:bg-[#111214] border-l border-neutral-200/80 dark:border-neutral-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out z-10 sm:rounded-l-[28px] overflow-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200/70 dark:border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <h2 id={titleId} className="text-lg font-bold text-neutral-900 dark:text-white">
              Giỏ hàng
            </h2>
            <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[11px] font-bold inline-flex items-center justify-center">
              {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="px-2.5 py-1 text-xs text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 font-medium rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Xoá tất cả
              </button>
            )}
            <button
              type="button"
              onClick={closeCart}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Đóng giỏ hàng"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Free Shipping Progress Banner */}
        <div className="mx-6 my-3.5 p-3.5 rounded-2xl bg-neutral-100/60 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800/70 space-y-2">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {isFreeShipping ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Bạn được hưởng ưu đãi vận chuyển miễn phí.
              </span>
            ) : (
              <>
                Mua thêm{' '}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formatVND(FREE_SHIPPING_THRESHOLD - subtotal)} VND
                </span>{' '}
                để được miễn phí vận chuyển.
              </>
            )}
          </p>
          <div className="w-full h-1.5 bg-neutral-200/80 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-400">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor">
                  <path d="M4 5h2l1.6 9.2a1.5 1.5 0 0 0 1.5 1.3h7.7a1.5 1.5 0 0 0 1.5-1.2L19.5 8H7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="19.5" r="1.2" fill="currentColor" />
                  <circle cx="17" cy="19.5" r="1.2" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Giỏ hàng của bạn đang trống
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-[240px]">
                  Khám phá các thiết bị flagship và phụ kiện công nghệ để bắt đầu.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="mt-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors active:scale-[0.985]"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.variantId}
                className="flex gap-3.5 p-3.5 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/60 dark:border-neutral-800/60 items-start transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                {/* Product Thumbnail */}
                <div className="w-20 h-20 rounded-xl bg-white dark:bg-neutral-800/60 p-2 flex items-center justify-center flex-shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 overflow-hidden shadow-xs">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                      {item.name.slice(0, 3)}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-1">
                  <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                    {item.variantName ? item.variantName.split('/')[0]?.trim() || 'Phụ kiện' : 'Thiết bị'}
                  </span>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate mt-0.5">
                    {item.name}
                  </h4>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                    {formatVND(item.unitPrice)}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                    {item.variantName}
                  </p>
                </div>

                {/* Stepper & Remove */}
                <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                  <div className="flex items-center border border-neutral-200/80 dark:border-neutral-700 rounded-full px-1 py-0.5 bg-white dark:bg-neutral-900 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      aria-label="Giảm số lượng"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-semibold text-neutral-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      aria-label="Tăng số lượng"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="text-[11px] text-neutral-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 transition-colors pt-2 mt-auto"
                  >
                    Loại bỏ
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer (Pinned at bottom) */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#111214] space-y-4">
            {/* Total Row */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Tổng cộng
              </span>
              <span className="text-base font-bold text-neutral-900 dark:text-white">
                {formatVND(subtotal)} VND
              </span>
            </div>

            {/* Discount Code Form */}
            <form onSubmit={handleApplyDiscount} className="relative flex items-center">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Nhập mã giảm giá khác"
                className="w-full px-4 py-2.5 pr-11 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white placeholder:text-neutral-400 text-neutral-900 dark:text-white"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-neutral-200 hover:bg-neutral-900 hover:text-white dark:bg-neutral-800 dark:hover:bg-white dark:hover:text-neutral-900 flex items-center justify-center transition-colors text-neutral-600 dark:text-neutral-300"
                aria-label="Áp dụng mã giảm giá"
              >
                <ArrowRightIcon />
              </button>
            </form>
            {discountMessage && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                {discountMessage}
              </p>
            )}

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full py-3.5 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.985] shadow-sm"
            >
              <LockIcon />
              <span>Thanh toán</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
