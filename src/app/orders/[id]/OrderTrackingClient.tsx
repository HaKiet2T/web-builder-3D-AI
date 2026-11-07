'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRealtimeOrderStatus } from '@/lib/orders/realtime';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
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
  const showCelebrationBanner = justPaid && !bannerDismissed;

  useEffect(() => {
    if (justPaid) {
      triggerCelebration();
    }
  }, [justPaid, triggerCelebration]);

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
      <footer style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.75rem',
            backgroundColor: '#111827',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Tiếp tục mua sắm
        </Link>
      </footer>
    </div>
  );
}
