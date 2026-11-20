import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { getFullSalesAnalytics } from '@/lib/admin/analytics-dal';
import { SalesPeriodSchema, type SalesPeriod } from '@/lib/admin/analytics-schema';
import { CategoryShareDonut } from '@/components/admin/analytics/CategoryShareDonut';
import { KpiCardGrid } from '@/components/admin/analytics/KpiCardGrid';
import { PaymentMethodDistributionCard } from '@/components/admin/analytics/PaymentMethodDistributionCard';
import { PeriodFilterBar } from '@/components/admin/analytics/PeriodFilterBar';
import { RevenueBarChart } from '@/components/admin/analytics/RevenueBarChart';
import { SalesAlertsTable } from '@/components/admin/analytics/SalesAlertsTable';
import { listAdminProducts } from '@/lib/catalog/dal';
import { listAdminOrders } from '@/lib/orders/dal';

export const metadata = { title: 'Tổng quan quản trị' };

interface AdminDashboardPageProps {
  searchParams?: Promise<{ period?: string }>;
}

export default function AdminDashboardPage(props: AdminDashboardPageProps) {
  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <p className="admin-eyebrow">HGK · QUẢN TRỊ</p>
        <h1>Tổng quan kinh doanh & Báo cáo</h1>
        <p>Trung tâm phân tích doanh thu, vận hành đơn hàng và cảnh báo bán hàng.</p>
      </header>
      <Suspense fallback={<p className="admin-notice" role="status" aria-busy="true">Đang tổng hợp báo cáo kinh doanh…</p>}>
        <AdminDashboardContent searchParamsPromise={props.searchParams} />
      </Suspense>
    </section>
  );
}

async function AdminDashboardContent({
  searchParamsPromise,
}: {
  searchParamsPromise?: Promise<{ period?: string }>;
}) {
  await connection();
  const searchParams = searchParamsPromise ? await searchParamsPromise : undefined;
  const parsedPeriod = SalesPeriodSchema.safeParse(searchParams?.period);
  const period: SalesPeriod = parsedPeriod.success ? parsedPeriod.data : '7d';

  const [products, orders, analytics] = await Promise.all([
    listAdminProducts(),
    listAdminOrders(),
    getFullSalesAnalytics({ period }),
  ]);

  const activeProducts = products.filter((product) => product.status === 'active').length;
  const pendingOrders = orders.filter(
    (order) => order.status === 'pending' || order.status === 'paid',
  ).length;

  return (
    <div className="admin-dashboard-stack">
      {/* 1. Bộ lọc kỳ báo cáo */}
      <PeriodFilterBar currentPeriod={period} />

      {/* 2. Khối thẻ chỉ số tài chính then chốt (Executive KPI Cards) */}
      <KpiCardGrid overview={analytics.overview} />

      {/* 3. Thẻ thống kê cơ bản đảm bảo tương thích ngược */}
      <div className="admin-metrics">
        <article>
          <span>Sản phẩm đang bán</span>
          <strong>{activeProducts}</strong>
        </article>
        <article>
          <span>Bản nháp / lưu trữ</span>
          <strong>{products.length - activeProducts}</strong>
        </article>
        <article>
          <span>Đơn cần xử lý</span>
          <strong>{pendingOrders}</strong>
        </article>
      </div>

      {/* 4. Khối đồ thị trực quan: Xu hướng doanh thu SVG & Tỷ trọng ngành hàng / Kênh thanh toán */}
      <div className="admin-analytics-charts-grid">
        <RevenueBarChart trend={analytics.trend} period={period} />
        <div className="admin-charts-sidebar">
          <CategoryShareDonut categoryShare={analytics.categoryShare} />
          <PaymentMethodDistributionCard paymentDistribution={analytics.paymentDistribution} />
        </div>
      </div>

      {/* 5. Khối cảnh báo vận hành và hàng tồn kho */}
      <SalesAlertsTable
        inventoryAlerts={analytics.inventoryAlerts}
        bottlenecks={analytics.bottlenecks}
      />

      {/* 6. Liên kết điều hướng nhanh */}
      <div className="admin-quick-links">
        <Link href="/admin/products">Quản lý sản phẩm và media →</Link>
        <Link href="/admin/orders">Xem và cập nhật đơn hàng →</Link>
      </div>
    </div>
  );
}
