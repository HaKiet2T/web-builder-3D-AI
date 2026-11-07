'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { useRealtimeOrderStatus } from '@/lib/orders/realtime';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useCartStore } from '@/store/cart';
import { claimGuestOrderAction, retryOrderPaymentAction } from '@/lib/account/actions';
import type { Order, OrderStatus } from '@/types/order';

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ xử lý', color: '#b45309', bg: '#fef3c7' },
  paid: { label: 'Đã thanh toán', color: '#047857', bg: '#d1fae5' },
  processing: { label: 'Đang xử lý đóng gói', color: '#1d4ed8', bg: '#dbeafe' },
  partially_fulfilled: { label: 'Đang giao một phần', color: '#6d28d9', bg: '#ede9fe' },
  fulfilled: { label: 'Giao hàng thành công', color: '#047857', bg: '#d1fae5' },
  cancelled: { label: 'Đã huỷ', color: '#b91c1c', bg: '#fee2e2' },
  failed: { label: 'Thanh toán thất bại', color: '#b91c1c', bg: '#fee2e2' },
};

interface OrderTrackingClientProps {
  initialOrder: Order;
}

export function OrderTrackingClient({ initialOrder }: OrderTrackingClientProps) {
  const { order, realtimeStatus, justPaid } = useRealtimeOrderStatus(initialOrder);
  const triggerCelebration = useWorkspaceStore((state) => state.triggerPaymentSuccess);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [repaySuccess, setRepaySuccess] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const [claimState, claimAction, isClaiming] = useActionState(claimGuestOrderAction, {});
  const [, repayAction, isRepaying] = useActionState(retryOrderPaymentAction, {});

  const showCelebrationBanner = justPaid && !bannerDismissed;
  const isUnpaid = order.status === 'pending' || order.paymentStatus === 'pending' || order.paymentStatus === 'failed';

  useEffect(() => {
    if (justPaid) {
      triggerCelebration();
    }
  }, [justPaid, triggerCelebration]);

  const handleReorder = () => {
    for (const item of order.items) {
      addItem({
        productId: item.productId,
        variantId: item.variantId || item.id,
        name: item.name,
        variantName: item.variant,
        imageUrl: null,
        unitPrice: item.price,
        stockStatus: item.stockStatus,
        quantity: item.quantity,
      });
    }
    openCart();
  };

  const currentStatusMeta = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Celebration Notification */}
      {showCelebrationBanner ? (
        <aside
          role="status"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: '#d1fae5',
            border: '1px solid #10b981',
            color: '#065f46',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          data-testid="payment-success-celebration"
        >
          <span>
            🎉 <strong>Tuyệt vời!</strong> Thanh toán cho đơn hàng {order.orderNumber} đã được xác nhận thành công theo thời gian thực!
          </span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </aside>
      ) : null}

      {/* Unpaid Warning Banner & Repay Action */}
      {isUnpaid && (
        <aside
          role="region"
          aria-label="Nhắc nhở thanh toán"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            color: '#92400e',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <strong>Đơn hàng đang chờ thanh toán ({formatPrice(order.totalAmount)})</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
              Vui lòng hoàn tất thanh toán để đơn hàng được đóng gói và giao hàng trong thời gian sớm nhất.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsRepayOpen(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#d97706',
              color: '#ffffff',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Thanh toán lại ngay
          </button>
        </aside>
      )}

      {/* Guest Claim Order Banner */}
      {!order.userId && (
        <aside
          role="region"
          aria-label="Liên kết đơn hàng"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <strong style={{ fontSize: '0.9rem', color: '#111827' }}>Bạn đã có tài khoản?</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
              Liên kết đơn hàng này vào tài khoản của bạn để dễ dàng theo dõi và hưởng ưu đãi bảo hành.
            </p>
          </div>
          <form action={claimAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="hidden" name="orderNumber" value={order.orderNumber} />
            <button
              type="submit"
              disabled={isClaiming}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#111827',
                color: '#ffffff',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {isClaiming ? 'Đang liên kết...' : 'Liên kết vào tài khoản'}
            </button>
          </form>
        </aside>
      )}

      {(claimState.error || claimState.success) && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            backgroundColor: claimState.error ? '#fee2e2' : '#d1fae5',
            color: claimState.error ? '#991b1b' : '#065f46',
            border: claimState.error ? '1px solid #f87171' : '1px solid #34d399',
          }}
        >
          {claimState.error || claimState.success}
        </div>
      )}

      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--line, rgba(25, 25, 25, 0.15))',
          paddingBottom: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em', color: '#6b7280' }}>
            THEO DÕI ĐƠN HÀNG THỜI GIAN THỰC
          </span>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0.25rem 0' }}>
            {order.orderNumber}
          </h1>
          <p style={{ color: '#4b5563', margin: 0, fontSize: '0.9rem' }}>
            Đặt lúc {formatDate(order.createdAt)}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <span
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: currentStatusMeta.color,
              backgroundColor: currentStatusMeta.bg,
            }}
            data-testid="order-status-badge"
          >
            {currentStatusMeta.label}
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: '#6b7280',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: realtimeStatus === 'connected' ? '#10b981' : '#f59e0b',
              }}
            />
            {realtimeStatus === 'connected' ? 'Realtime đang đồng bộ' : 'Đang cập nhật'}
          </span>
        </div>
      </header>

      {/* Progress Stepper */}
      <nav aria-label="Tiến trình đơn hàng" style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <div
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid #10b981',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
            }}
          >
            ✓ Đã tạo đơn
          </div>
          <div
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: '6px',
              border:
                order.paymentStatus === 'paid' || order.status === 'paid' || order.status === 'processing' || order.status === 'fulfilled'
                  ? '1px solid #10b981'
                  : '1px solid #e5e7eb',
              backgroundColor:
                order.paymentStatus === 'paid' || order.status === 'paid' || order.status === 'processing' || order.status === 'fulfilled'
                  ? '#ecfdf5'
                  : '#f9fafb',
              color:
                order.paymentStatus === 'paid' || order.status === 'paid' || order.status === 'processing' || order.status === 'fulfilled'
                  ? '#065f46'
                  : '#9ca3af',
            }}
          >
            {order.paymentStatus === 'paid' ? '✓ Đã thanh toán' : 'Chờ thanh toán'}
          </div>
          <div
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: '6px',
              border:
                order.status === 'processing' || order.status === 'partially_fulfilled' || order.status === 'fulfilled'
                  ? '1px solid #10b981'
                  : '1px solid #e5e7eb',
              backgroundColor:
                order.status === 'processing' || order.status === 'partially_fulfilled' || order.status === 'fulfilled'
                  ? '#ecfdf5'
                  : '#f9fafb',
              color:
                order.status === 'processing' || order.status === 'partially_fulfilled' || order.status === 'fulfilled'
                  ? '#065f46'
                  : '#9ca3af',
            }}
          >
            Đóng gói & Chuẩn bị
          </div>
          <div
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: '6px',
              border: order.status === 'fulfilled' ? '1px solid #10b981' : '1px solid #e5e7eb',
              backgroundColor: order.status === 'fulfilled' ? '#ecfdf5' : '#f9fafb',
              color: order.status === 'fulfilled' ? '#065f46' : '#9ca3af',
            }}
          >
            Hoàn tất giao hàng
          </div>
        </div>
      </nav>

      {/* Grid: Order details & Customer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Customer & Shipping */}
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid var(--line, rgba(25, 25, 25, 0.15))',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
            Thông tin nhận hàng
          </h2>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Người nhận:</strong> {order.customer.fullName}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Điện thoại:</strong> {order.customer.phone}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Email:</strong> {order.customer.email}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Địa chỉ:</strong> {order.customer.address}, {order.customer.city}
          </p>
          {order.customer.notes ? (
            <p style={{ margin: '0.25rem 0', color: '#6b7280' }}>
              <strong>Ghi chú:</strong> {order.customer.notes}
            </p>
          ) : null}
        </div>

        {/* Fulfillments / Shipments */}
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid var(--line, rgba(25, 25, 25, 0.15))',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
            Kiện hàng vận chuyển ({order.fulfillments.length})
          </h2>
          {order.fulfillments.map((fulfillment, idx) => (
            <div
              key={fulfillment.id}
              style={{
                padding: '0.75rem',
                border: '1px solid #f3f4f6',
                borderRadius: '6px',
                backgroundColor: '#fafafa',
                marginBottom: idx < order.fulfillments.length - 1 ? '0.75rem' : 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>
                  {fulfillment.type === 'preorder' ? '📦 Kiện đặt trước' : '⚡ Kiện giao ngay'}
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {fulfillment.status}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: '0.25rem 0' }}>
                Dự kiến: {fulfillment.estimatedDelivery}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: '0.25rem 0' }}>
                Sản phẩm: {fulfillment.items.length} món · Cước: {formatPrice(fulfillment.shippingFee)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Items list */}
      <section
        style={{
          border: '1px solid var(--line, rgba(25, 25, 25, 0.15))',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
          Sản phẩm trong đơn
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {order.items.map((item) => (
            <li
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{item.name}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                  Phân loại: {item.variant} · Số lượng: {item.quantity} · {item.stockStatus === 'preorder' ? 'Đặt trước' : 'Sẵn hàng'}
                </p>
              </div>
              <span style={{ fontWeight: 600 }}>{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--line, rgba(25, 25, 25, 0.15))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.35rem 0' }}>
            <span>Tạm tính</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.35rem 0' }}>
            <span>Phí vận chuyển</span>
            <span>{order.shippingTotal === 0 ? 'Miễn phí' : formatPrice(order.shippingTotal)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              margin: '0.75rem 0 0 0',
              paddingTop: '0.75rem',
              borderTop: '1px dashed #e5e7eb',
              fontSize: '1.25rem',
              fontWeight: 800,
            }}
          >
            <span>Tổng thanh toán</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </section>

      {/* Action buttons */}
      <footer style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.75rem',
            backgroundColor: '#111827',
            color: '#ffffff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          Tiếp tục mua sắm
        </Link>

        <button
          type="button"
          onClick={handleReorder}
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#ffffff',
            color: '#111827',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Mua lại đơn này
        </button>

        <Link
          href="/account/orders"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          Đơn hàng của tôi →
        </Link>
      </footer>

      {/* Repay Modal */}
      {isRepayOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Thanh toán lại đơn hàng
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsRepayOpen(false);
                  setRepaySuccess(null);
                }}
                style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Số tiền thanh toán:</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>
                {formatPrice(order.totalAmount)}
              </div>
            </div>

            {repaySuccess ? (
              <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.85rem' }}>
                ✓ {repaySuccess}
              </div>
            ) : (
              <form
                action={async (formData) => {
                  await repayAction(formData);
                  setRepaySuccess('Đã cập nhật phương thức thanh toán!');
                  setTimeout(() => {
                    setIsRepayOpen(false);
                    setRepaySuccess(null);
                  }, 1500);
                }}
              >
                <input type="hidden" name="orderId" value={order.id} />

                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Chọn hình thức thanh toán:
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input type="radio" name="paymentMethod" value="vnpay" defaultChecked />
                    <span>VNPAY-QR</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input type="radio" name="paymentMethod" value="momo" />
                    <span>Ví MoMo</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input type="radio" name="paymentMethod" value="cod" />
                    <span>COD khi nhận</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input type="radio" name="paymentMethod" value="card" />
                    <span>Thẻ Visa/Master</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsRepayOpen(false)}
                    style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isRepaying}
                    style={{ padding: '0.5rem 1.25rem', backgroundColor: '#111827', color: '#ffffff', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    {isRepaying ? 'Đang lưu...' : 'Xác nhận thanh toán'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
