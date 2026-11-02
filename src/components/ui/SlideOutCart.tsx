'use client';

import { useState } from 'react';
import { useWorkspaceStore, type ShipmentItem } from '@/store/useWorkspaceStore';
import type { Order } from '@/types/order';

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export function SlideOutCart() {
  const isCartOpen = useWorkspaceStore((state) => state.isCartOpen);
  const setIsCartOpen = useWorkspaceStore((state) => state.setIsCartOpen);
  const cartItems = useWorkspaceStore((state) => state.cartItems);
  const removeFromCart = useWorkspaceStore((state) => state.removeFromCart);
  const updateQuantity = useWorkspaceStore((state) => state.updateQuantity);
  const addToCart = useWorkspaceStore((state) => state.addToCart);
  const clearCart = useWorkspaceStore((state) => state.clearCart);
  const isNight = useWorkspaceStore((state) => state.isNight);
  const triggerPaymentSuccess = useWorkspaceStore((state) => state.triggerPaymentSuccess);

  const subtotal = useWorkspaceStore((state) => state.getCartSubtotal());
  const shippingFee = useWorkspaceStore((state) => state.getShippingFee());
  const grandTotal = useWorkspaceStore((state) => state.getGrandTotal());
  const { inStockGroup, preorderGroup } = useWorkspaceStore((state) => state.getSplitShipment());

  const isSplit = inStockGroup.length > 0 && preorderGroup.length > 0;
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Checkout states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick accessory add for testing Split Shipment
  const handleAddPreorderAccessory = () => {
    addToCart({
      id: 'acc-cnc-stand-preorder',
      name: 'Chân đế Nhôm Phay CNC Studio Stand',
      quantity: 1,
      unitPrice: 690_000,
      stockStatus: 'preorder',
    });
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        customer: {
          fullName: 'Hà Gia Kiệt',
          email: 'kietjob24h@gmail.com',
          phone: '0987654321',
          address: 'Tòa nhà Landmark 81, Quận Bình Thạnh',
          city: 'Hồ Chí Minh',
          postalCode: '700000',
          notes: 'Giao giờ hành chính, gọi trước khi giao hàng.',
        },
        items: cartItems.map((item) => ({
          productId: item.id,
          name: item.name,
          variant: item.variant || 'graphite',
          price: item.unitPrice,
          quantity: item.quantity,
          stockStatus: item.stockStatus,
        })),
        paymentMethod: 'stripe',
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Đặt hàng thất bại');
      }

      setCompletedOrder(data.order);
      triggerPaymentSuccess();
      clearCart();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi thanh toán';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className={`relative w-screen max-w-md sm:max-w-lg border-l shadow-2xl flex flex-col ${
            isNight
              ? 'border-white/10 bg-[#10141d]/95 text-white'
              : 'border-black/10 bg-white/95 text-[#202326]'
          } backdrop-blur-2xl transition-transform duration-500`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-current/10 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight">Giỏ hàng</h2>
              <span className="rounded-full bg-current/10 px-2.5 py-0.5 text-xs font-semibold">
                {totalItemsCount} sản phẩm
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="rounded-full p-2 text-current/60 hover:bg-current/10 hover:text-current transition"
              aria-label="Đóng giỏ hàng"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            {/* Success Modal when order placed */}
            {completedOrder ? (
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-4 text-xl font-bold text-emerald-500">Đặt hàng thành công!</h3>
                <p className="mt-1 text-xs text-current/70">Mã đơn: {completedOrder.orderNumber}</p>
                <p className="mt-3 text-sm text-current/80">
                  Hiệu ứng pháo hoa 3D InstancedMesh đã kích hoạt! Email biên lai điện tử (Dark-theme) đã được gửi đến{' '}
                  <span className="font-semibold text-current">{completedOrder.customer.email}</span>.
                </p>

                {completedOrder.isSplitShipment && (
                  <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-xs">
                    <p className="font-semibold text-amber-500">⚡ Đã kích hoạt cơ chế Tách đơn kép:</p>
                    <ul className="mt-2 space-y-1 text-current/80">
                      <li>• Kiện hàng có sẵn: Đang đóng gói (Giao trong 2-4 ngày)</li>
                      <li>• Kiện hàng đặt trước: Lô sản xuất (Giao trong 14-21 ngày)</li>
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null);
                    setIsCartOpen(false);
                  }}
                  className="mt-6 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Tiếp tục trải nghiệm
                </button>
              </div>
            ) : cartItems.length === 0 ? (
              /* Empty Cart State */
              <div className="flex h-full flex-col items-center justify-center text-center py-12">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-current/[0.05]">
                  <svg className="h-10 w-10 text-current/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </div>
                <h3 className="mt-5 text-lg font-bold">Giỏ hàng của bạn đang trống</h3>
                <p className="mt-2 max-w-xs text-sm text-current/60">
                  Tùy chỉnh màu sắc loa Studio One và thêm vào giỏ để bắt đầu trải nghiệm âm học.
                </p>
                <button
                  type="button"
                  onClick={() => addToCart()}
                  className="mt-6 rounded-full bg-[#202326] dark:bg-white dark:text-black px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  Thêm Loa Studio One vào giỏ
                </button>
              </div>
            ) : (
              /* Populated Cart with Split Shipment UI */
              <div className="space-y-6">
                {/* Split Shipment Notice Badge */}
                {isSplit && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-amber-500 text-base">⚡</span>
                      <div>
                        <p className="font-bold text-amber-500">Tự động Tách đơn (Split Shipment)</p>
                        <p className="mt-0.5 leading-relaxed text-current/80">
                          Đơn hàng gồm 2 kiện hàng độc lập: hàng có sẵn xuất kho ngay, hàng đặt trước sẽ xuất xưởng theo lô. Phí vận chuyển kép (35.000₫ × 2).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Group 1: In-stock items */}
                {inStockGroup.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between border-b border-current/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                          Kiện 1: Giao ngay (In-Stock)
                        </span>
                      </div>
                      <span className="text-[11px] text-current/60">2 - 4 ngày làm việc</span>
                    </div>

                    <div className="mt-3 divide-y divide-current/10">
                      {inStockGroup.map((item) => (
                        <CartItemRow
                          key={item.id}
                          item={item}
                          updateQuantity={updateQuantity}
                          removeFromCart={removeFromCart}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Group 2: Pre-order items */}
                {preorderGroup.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between border-b border-current/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                          Kiện 2: Đặt trước (Pre-Order)
                        </span>
                      </div>
                      <span className="text-[11px] text-current/60">14 - 21 ngày làm việc</span>
                    </div>

                    <div className="mt-3 divide-y divide-current/10">
                      {preorderGroup.map((item) => (
                        <CartItemRow
                          key={item.id}
                          item={item}
                          updateQuantity={updateQuantity}
                          removeFromCart={removeFromCart}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Add Preorder Accessory to test Split Shipment */}
                {!preorderGroup.length && (
                  <div className="rounded-2xl border border-dashed border-current/20 p-4 text-center">
                    <p className="text-xs text-current/70">
                      Thử nghiệm tính năng Tách đơn Split Shipment & Phí ship kép:
                    </p>
                    <button
                      type="button"
                      onClick={handleAddPreorderAccessory}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition"
                    >
                      + Thêm Chân đế nhôm CNC (Pre-order: 690.000₫)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer & Checkout Breakdown */}
          {cartItems.length > 0 && !completedOrder && (
            <div className="border-t border-current/10 bg-current/[0.02] p-6 sm:p-8 backdrop-blur-md">
              {errorMessage && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-current/70">
                  <span>Tạm tính ({totalItemsCount} món)</span>
                  <span className="font-mono font-medium">{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between text-current/70">
                  <span>
                    Phí vận chuyển {isSplit ? '(Kép 2 kiện)' : '(1 kiện)'}
                  </span>
                  <span className="font-mono font-medium">{formatVND(shippingFee)}</span>
                </div>
                <div className="flex items-baseline justify-between border-t border-current/10 pt-3 text-base font-bold">
                  <span>Tổng thanh toán</span>
                  <span className="font-mono text-xl">{formatVND(grandTotal)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#202326] dark:bg-white dark:text-black py-4 text-sm font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-50 transition"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Đang xử lý đơn hàng...</span>
                  </>
                ) : (
                  <span>Tiến hành Thanh toán ({formatVND(grandTotal)})</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CartItemRow({
  item,
  updateQuantity,
  removeFromCart,
}: {
  item: ShipmentItem;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 gap-4">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold truncate">{item.name}</h4>
        <div className="mt-1 flex items-center gap-2 text-xs text-current/60">
          <span className="font-mono">{formatVND(item.unitPrice)}</span>
          <span>•</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              item.stockStatus === 'in-stock'
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-amber-500/10 text-amber-500'
            }`}
          >
            {item.stockStatus === 'in-stock' ? 'Có sẵn' : 'Đặt trước'}
          </span>
        </div>
      </div>

      {/* Quantity & Delete Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-current/15 bg-current/[0.04]">
          <button
            type="button"
            onClick={() => updateQuantity(item.id, -1)}
            className="px-2.5 py-1 text-xs hover:bg-current/10 transition"
            aria-label="Giảm số lượng"
          >
            -
          </button>
          <span className="px-2 text-xs font-bold font-mono">{item.quantity}</span>
          <button
            type="button"
            onClick={() => updateQuantity(item.id, 1)}
            className="px-2.5 py-1 text-xs hover:bg-current/10 transition"
            aria-label="Tăng số lượng"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => removeFromCart(item.id)}
          className="text-current/40 hover:text-red-500 transition p-1"
          aria-label="Xóa sản phẩm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
