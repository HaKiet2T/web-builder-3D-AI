'use client';

import { useMemo, useState } from 'react';
import { updateOrderStatusAction } from '@/app/admin/(dashboard)/actions';
import { useRealtimeOrders } from '@/lib/orders/realtime';
import type { Order, OrderStatus } from '@/types/order';

const ORDER_STATUSES: Array<{ value: OrderStatus; label: string }> = [
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'partially_fulfilled', label: 'Giao một phần' },
  { value: 'fulfilled', label: 'Đã hoàn tất' },
  { value: 'cancelled', label: 'Đã huỷ' },
  { value: 'failed', label: 'Thất bại' },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

interface AdminOrdersRealtimeProps {
  initialOrders: Order[];
}

export function AdminOrdersRealtime({ initialOrders }: AdminOrdersRealtimeProps) {
  const { orders, realtimeStatus, latestNewOrder, clearAlert } = useRealtimeOrders(initialOrders);
  const [selectedFilter, setSelectedFilter] = useState<'all' | OrderStatus>('all');

  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'all') return orders;
    return orders.filter((order) => order.status === selectedFilter);
  }, [orders, selectedFilter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    for (const status of ORDER_STATUSES) {
      map[status.value] = orders.filter((o) => o.status === status.value).length;
    }
    return map;
  }, [orders]);

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p className="admin-eyebrow">VẬN HÀNH THỜI GIAN THỰC</p>
            <h1>Đơn hàng</h1>
            <p>{orders.length} đơn được lưu trong hệ thống.</p>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid var(--line, #e5e7eb)',
              backgroundColor: 'var(--panel, #ffffff)',
            }}
            data-testid="realtime-status-badge"
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  realtimeStatus === 'connected'
                    ? '#10b981'
                    : realtimeStatus === 'connecting'
                      ? '#f59e0b'
                      : '#6b7280',
                boxShadow: realtimeStatus === 'connected' ? '0 0 8px #10b981' : 'none',
              }}
            />
            <span>
              {realtimeStatus === 'connected'
                ? 'Realtime đang kết nối'
                : realtimeStatus === 'connecting'
                  ? 'Đang kết nối Realtime…'
                  : 'Ngoại tuyến / Dữ liệu tĩnh'}
            </span>
          </div>
        </div>
      </header>

      {latestNewOrder ? (
        <aside
          className="admin-success"
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            animation: 'fadeIn 0.3s ease-out',
          }}
          data-testid="new-order-alert"
        >
          <span>
            🔔 <strong>Đơn hàng mới nhận:</strong> {latestNewOrder.orderNumber} từ{' '}
            {latestNewOrder.customer.fullName} ({formatPrice(latestNewOrder.totalAmount)})
          </span>
          <button
            type="button"
            onClick={clearAlert}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              padding: '0.2rem 0.5rem',
            }}
          >
            ✕
          </button>
        </aside>
      ) : null}

      {/* Bộ lọc trạng thái nhanh */}
      <nav
        aria-label="Lọc theo trạng thái"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          className={`admin-button ${selectedFilter === 'all' ? 'admin-button-primary' : ''}`}
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.85rem',
            background: selectedFilter === 'all' ? '#111827' : 'transparent',
            color: selectedFilter === 'all' ? '#ffffff' : 'inherit',
          }}
        >
          Tất cả ({counts.all ?? 0})
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() => setSelectedFilter(status.value)}
            className={`admin-button ${selectedFilter === status.value ? 'admin-button-primary' : ''}`}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.85rem',
              background: selectedFilter === status.value ? '#111827' : 'transparent',
              color: selectedFilter === status.value ? '#ffffff' : 'inherit',
            }}
          >
            {status.label} ({counts[status.value] ?? 0})
          </button>
        ))}
      </nav>

      {filteredOrders.length === 0 ? (
        <p className="admin-empty">
          {selectedFilter === 'all' ? 'Chưa có đơn hàng nào.' : 'Không có đơn hàng nào ở trạng thái này.'}
        </p>
      ) : (
        <div className="admin-order-list" data-testid="orders-list">
          {filteredOrders.map((order) => {
            const isNew = latestNewOrder?.id === order.id;
            return (
              <article
                className={`admin-panel admin-order-card ${isNew ? 'admin-order-card-new' : ''}`}
                key={order.id}
                style={{
                  border: isNew ? '2px solid #10b981' : undefined,
                  transition: 'border 0.3s ease',
                }}
              >
                <header>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h2>{order.orderNumber}</h2>
                      {isNew ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            background: '#10b981',
                            color: '#ffffff',
                          }}
                        >
                          MỚI
                        </span>
                      ) : null}
                    </div>
                    <p>
                      {formatDate(order.createdAt)} · {order.customer.fullName}
                    </p>
                  </div>
                  <strong>{formatPrice(order.totalAmount)}</strong>
                </header>
                <p>
                  {order.customer.email} · {order.customer.phone}
                </p>
                <p>
                  {order.customer.address}, {order.customer.city}
                </p>
                {order.customer.notes ? <p>Ghi chú: {order.customer.notes}</p> : null}
                <p>
                  {order.items.length} dòng sản phẩm · {order.fulfillments.length} kiện · Thanh toán: {order.paymentStatus}
                </p>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.name} - {item.variant} × {item.quantity}
                    </li>
                  ))}
                </ul>
                <form className="admin-order-status" action={updateOrderStatusAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <label>
                    Trạng thái
                    <select name="status" defaultValue={order.status}>
                      {ORDER_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="admin-button" type="submit">
                    Cập nhật
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
