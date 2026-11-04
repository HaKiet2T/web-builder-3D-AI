import Link from 'next/link';
import { connection } from 'next/server';
import { listAdminProducts } from '@/lib/catalog/dal';
import { listAdminOrders } from '@/lib/orders/dal';

export const metadata = { title: 'Tổng quan quản trị' };

export default async function AdminDashboardPage() {
  await connection();
  const [products, orders] = await Promise.all([listAdminProducts(), listAdminOrders()]);
  const activeProducts = products.filter((product) => product.status === 'active').length;
  const pendingOrders = orders.filter(
    (order) => order.status === 'pending' || order.status === 'paid',
  ).length;

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <p className="admin-eyebrow">HGK · QUẢN TRỊ</p>
        <h1>Tổng quan</h1>
        <p>Trạng thái cửa hàng và các việc cần xử lý.</p>
      </header>
      <div className="admin-metrics">
        <article><span>Sản phẩm đang bán</span><strong>{activeProducts}</strong></article>
        <article><span>Bản nháp / lưu trữ</span><strong>{products.length - activeProducts}</strong></article>
        <article><span>Đơn cần xử lý</span><strong>{pendingOrders}</strong></article>
      </div>
      <div className="admin-quick-links">
        <Link href="/admin/products">Quản lý sản phẩm và media →</Link>
        <Link href="/admin/orders">Xem và cập nhật đơn hàng →</Link>
      </div>
    </section>
  );
}
