import type { Metadata } from 'next';
import { connection } from 'next/server';
import { updateOrderStatusAction } from '@/app/admin/(dashboard)/actions';
import { listAdminOrders } from '@/lib/orders/dal';
import type { OrderStatus } from '@/types/order';

export const metadata: Metadata = { title: 'Đơn hàng' };

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

interface OrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  await connection();
  const [orders, query] = await Promise.all([listAdminOrders(), searchParams]);

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <p className="admin-eyebrow">VẬN HÀNH</p>
        <h1>Đơn hàng</h1>
        <p>{orders.length} đơn được lưu trong Supabase.</p>
      </header>
      {query.updated ? <p className="admin-success" role="status">Đã cập nhật trạng thái đơn.</p> : null}

      {orders.length === 0 ? (
        <p className="admin-empty">Chưa có đơn hàng nào.</p>
      ) : (
        <div className="admin-order-list">
          {orders.map((order) => (
            <article className="admin-panel admin-order-card" key={order.id}>
              <header>
                <div>
                  <h2>{order.orderNumber}</h2>
                  <p>{formatDate(order.createdAt)} · {order.customer.fullName}</p>
                </div>
                <strong>{formatPrice(order.totalAmount)}</strong>
              </header>
              <p>{order.customer.email} · {order.customer.phone}</p>
              <p>{order.customer.address}, {order.customer.city}</p>
              {order.customer.notes ? <p>Ghi chú: {order.customer.notes}</p> : null}
              <p>{order.items.length} dòng sản phẩm · {order.fulfillments.length} kiện · {order.paymentStatus}</p>
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>{item.name} — {item.variant} × {item.quantity}</li>
                ))}
              </ul>
              <form className="admin-order-status" action={updateOrderStatusAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <label>
                  Trạng thái
                  <select name="status" defaultValue={order.status}>
                    {ORDER_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </label>
                <button className="admin-button" type="submit">Cập nhật</button>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
