import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const dashboardPage = readFileSync('src/app/admin/(dashboard)/page.tsx', 'utf8');
const periodBar = readFileSync('src/components/admin/analytics/PeriodFilterBar.tsx', 'utf8');
const kpiGrid = readFileSync('src/components/admin/analytics/KpiCardGrid.tsx', 'utf8');
const barChart = readFileSync('src/components/admin/analytics/RevenueBarChart.tsx', 'utf8');
const donutChart = readFileSync('src/components/admin/analytics/CategoryShareDonut.tsx', 'utf8');
const paymentCard = readFileSync(
  'src/components/admin/analytics/PaymentMethodDistributionCard.tsx',
  'utf8',
);
const alertsTable = readFileSync('src/components/admin/analytics/SalesAlertsTable.tsx', 'utf8');
const globalCss = readFileSync('src/app/globals.css', 'utf8');

describe('Admin Sales Analytics Dashboard & Native SVG UI (Giai đoạn 2)', () => {
  describe('Page Architecture & Suspense Boundary', () => {
    it('maintains non-async AdminDashboardPage with route-local Suspense boundary', () => {
      assert.match(dashboardPage, /<Suspense[\s\S]*<AdminDashboardContent/);
      assert.doesNotMatch(dashboardPage, /export default async function AdminDashboardPage/);
      assert.match(dashboardPage, /export default function AdminDashboardPage/);
    });

    it('passes searchParamsPromise to AdminDashboardContent and validates period', () => {
      assert.match(dashboardPage, /searchParamsPromise\?: Promise<{ period\?: string }>/);
      assert.match(dashboardPage, /SalesPeriodSchema\.safeParse/);
      assert.match(dashboardPage, /getFullSalesAnalytics/);
    });

    it('preserves backward compatibility metrics and quick links', () => {
      assert.match(dashboardPage, /className="admin-metrics"/);
      assert.match(dashboardPage, /Sản phẩm đang bán/);
      assert.match(dashboardPage, /Bản nháp \/ lưu trữ/);
      assert.match(dashboardPage, /Đơn cần xử lý/);
      assert.match(dashboardPage, /className="admin-quick-links"/);
      assert.match(dashboardPage, /href="\/admin\/products"/);
      assert.match(dashboardPage, /href="\/admin\/orders"/);
    });
  });

  describe('PeriodFilterBar Component', () => {
    it('provides all 5 core time period tabs with friendly Vietnamese labels', () => {
      assert.match(periodBar, /today/);
      assert.match(periodBar, /Hôm nay/);
      assert.match(periodBar, /7d/);
      assert.match(periodBar, /7 ngày qua/);
      assert.match(periodBar, /14d/);
      assert.match(periodBar, /14 ngày qua/);
      assert.match(periodBar, /30d/);
      assert.match(periodBar, /30 ngày qua/);
      assert.match(periodBar, /this_month/);
      assert.match(periodBar, /Tháng này/);
    });

    it('generates URL links to update searchParams period', () => {
      assert.match(periodBar, /href=\{`\/admin\?period=\$\{option\.id\}`\}/);
      assert.match(periodBar, /aria-selected=\{isActive\}/);
      assert.match(periodBar, /admin-period-pill/);
    });
  });

  describe('KpiCardGrid Component', () => {
    it('displays total revenue with growth rate and previous period comparison', () => {
      assert.match(kpiGrid, /Doanh thu thực thu/);
      assert.match(kpiGrid, /growth-up/);
      assert.match(kpiGrid, /growth-down/);
      assert.match(kpiGrid, /growth-neutral/);
      assert.match(kpiGrid, /formatVND\(overview\.totalRevenue\)/);
      assert.match(kpiGrid, /formatVND\(overview\.previousPeriodRevenue\)/);
    });

    it('displays paid order volume and cancellation rate', () => {
      assert.match(kpiGrid, /Đơn hàng thanh toán/);
      assert.match(kpiGrid, /overview\.paidOrdersCount/);
      assert.match(kpiGrid, /overview\.totalOrders/);
      assert.match(kpiGrid, /Tỷ lệ huỷ đơn/);
      assert.match(kpiGrid, /overview\.cancellationRate/);
    });

    it('displays Average Order Value (AOV) and fulfillment health', () => {
      assert.match(kpiGrid, /Giá trị trung bình đơn/);
      assert.match(kpiGrid, /formatVND\(overview\.averageOrderValue\)/);
      assert.match(kpiGrid, /Đơn chờ hoàn tất/);
      assert.match(kpiGrid, /overview\.pendingFulfillmentCount/);
      assert.match(kpiGrid, /overview\.splitShipmentCount/);
      assert.match(kpiGrid, /overview\.preorderOrdersCount/);
    });
  });

  describe('RevenueBarChart Component', () => {
    it('renders responsive native SVG with viewBox without external charting packages', () => {
      assert.match(barChart, /viewBox={`0 0 \$\{svgWidth\} \$\{svgHeight\}`\}/);
      assert.match(barChart, /className="admin-svg-chart"/);
      assert.match(barChart, /admin-chart-bar/);
      assert.doesNotMatch(barChart, /from 'recharts'/);
      assert.doesNotMatch(barChart, /from 'chart\.js'/);
    });

    it('includes grid ticks and compact Vietnamese currency formatting', () => {
      assert.match(barChart, /formatCompactVND/);
      assert.match(barChart, /gridTicks\.map/);
      assert.match(barChart, /strokeDasharray/);
    });

    it('renders bars, hover tooltips and formatted date labels', () => {
      assert.match(barChart, /trend\.map/);
      assert.match(barChart, /<rect[\s\S]*admin-chart-bar/);
      assert.match(barChart, /<title>/);
      assert.match(barChart, /chart-date-label/);
      assert.match(barChart, /formatDateShort/);
    });
  });

  describe('CategoryShareDonut Component', () => {
    it('renders native SVG donut segments using circumference and stroke-dasharray', () => {
      assert.match(donutChart, /2 \* Math\.PI \* radius/);
      assert.match(donutChart, /strokeDasharray=\{slice\.strokeDasharray\}/);
      assert.match(donutChart, /strokeDashoffset=\{slice\.strokeDashoffset\}/);
      assert.doesNotMatch(donutChart, /from 'recharts'/);
    });

    it('renders category legend table with revenue and percentages', () => {
      assert.match(donutChart, /admin-donut-legend-table/);
      assert.match(donutChart, /donut-category-revenue/);
      assert.match(donutChart, /slice\.percentage\.toFixed\(1\)/);
      assert.match(donutChart, /slice\.itemsSold/);
    });
  });

  describe('PaymentMethodDistributionCard Component', () => {
    it('displays comparative payment methods for VietQR and COD', () => {
      assert.match(paymentCard, /admin-payment-bar/);
      assert.match(paymentCard, /segment-vietqr/);
      assert.match(paymentCard, /segment-cod/);
      assert.match(paymentCard, /item\.percentage\.toFixed\(1\)/);
      assert.match(paymentCard, /formatVND\(item\.totalAmount\)/);
    });
  });

  describe('SalesAlertsTable Component', () => {
    it('categorizes inventory alerts into critical, warning, and preorder', () => {
      assert.match(alertsTable, /Cảnh báo tồn kho an toàn/);
      assert.match(alertsTable, /is-critical/);
      assert.match(alertsTable, /is-warning/);
      assert.match(alertsTable, /is-preorder/);
      assert.match(alertsTable, /table-item-name/);
      assert.match(alertsTable, /table-sku-code/);
    });

    it('lists fulfillment bottlenecks and highlights split shipments', () => {
      assert.match(alertsTable, /Đơn hàng cần đóng gói & xuất kho/);
      assert.match(alertsTable, /table-order-num/);
      assert.match(alertsTable, /hoursWaiting/);
      assert.match(alertsTable, /table-split-pill/);
      assert.match(alertsTable, /table-standard-pill/);
    });
  });

  describe('Global CSS Tactile Design Standards', () => {
    it('includes responsive styles for KPI grid, charts grid, and alerts layout', () => {
      assert.match(globalCss, /\.admin-kpi-grid/);
      assert.match(globalCss, /\.admin-analytics-charts-grid/);
      assert.match(globalCss, /\.admin-alerts-layout/);
      assert.match(globalCss, /\.admin-period-pill/);
      assert.match(globalCss, /\.admin-svg-chart/);
      assert.match(globalCss, /\.donut-segment/);
    });
  });
});
