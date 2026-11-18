import type { SalesOverview } from '@/lib/admin/analytics-schema';

interface KpiCardGridProps {
  overview: SalesOverview;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

export function KpiCardGrid({ overview }: KpiCardGridProps) {
  const isPositiveGrowth = overview.revenueGrowthRate > 0;
  const isZeroGrowth = overview.revenueGrowthRate === 0;
  const growthSign = isPositiveGrowth ? '+' : '';
  const growthClass = isPositiveGrowth
    ? 'growth-up'
    : isZeroGrowth
      ? 'growth-neutral'
      : 'growth-down';

  return (
    <div className="admin-kpi-grid" role="region" aria-label="Các chỉ số tài chính và bán hàng then chốt">
      {/* 1. Doanh thu thực thu */}
      <article className="admin-kpi-card" data-metric="revenue">
        <header className="admin-kpi-header">
          <span className="admin-kpi-title">Doanh thu thực thu</span>
          <span className={`admin-kpi-badge ${growthClass}`}>
            {growthSign}{overview.revenueGrowthRate.toFixed(1)}%
          </span>
        </header>
        <strong className="admin-kpi-value">{formatVND(overview.totalRevenue)}</strong>
        <p className="admin-kpi-subtext">
          Kỳ trước: <span>{formatVND(overview.previousPeriodRevenue)}</span>
        </p>
      </article>

      {/* 2. Đơn hàng thành công */}
      <article className="admin-kpi-card" data-metric="orders">
        <header className="admin-kpi-header">
          <span className="admin-kpi-title">Đơn hàng thanh toán</span>
          <span className="admin-kpi-badge info">
            {overview.totalOrders > 0
              ? `${Math.round((overview.paidOrdersCount / overview.totalOrders) * 100)}%`
              : '0%'}
          </span>
        </header>
        <strong className="admin-kpi-value">
          {overview.paidOrdersCount} <small className="admin-kpi-unit">/ {overview.totalOrders} đơn</small>
        </strong>
        <p className="admin-kpi-subtext">
          Tỷ lệ huỷ đơn: <span>{overview.cancellationRate.toFixed(1)}%</span>
        </p>
      </article>

      {/* 3. Giá trị trung bình đơn (AOV) */}
      <article className="admin-kpi-card" data-metric="aov">
        <header className="admin-kpi-header">
          <span className="admin-kpi-title">Giá trị trung bình đơn</span>
          <span className="admin-kpi-badge neutral">AOV</span>
        </header>
        <strong className="admin-kpi-value">{formatVND(overview.averageOrderValue)}</strong>
        <p className="admin-kpi-subtext">Đo lường hiệu quả bán chéo & combo 3D</p>
      </article>

      {/* 4. Vận hành & Đóng gói */}
      <article className="admin-kpi-card" data-metric="fulfillment">
        <header className="admin-kpi-header">
          <span className="admin-kpi-title">Đơn chờ hoàn tất</span>
          {overview.pendingFulfillmentCount > 0 ? (
            <span className="admin-kpi-badge warning">Cần xử lý</span>
          ) : (
            <span className="admin-kpi-badge success">Ổn định</span>
          )}
        </header>
        <strong className="admin-kpi-value">
          {overview.pendingFulfillmentCount} <small className="admin-kpi-unit">đơn</small>
        </strong>
        <p className="admin-kpi-subtext">
          {overview.splitShipmentCount} kiện tách · {overview.preorderOrdersCount} đơn đặt trước
        </p>
      </article>
    </div>
  );
}
