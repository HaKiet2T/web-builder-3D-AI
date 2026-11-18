import type { DailyRevenuePoint, SalesPeriod } from '@/lib/admin/analytics-schema';

interface RevenueBarChartProps {
  trend: DailyRevenuePoint[];
  period: SalesPeriod;
}

function formatCompactVND(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace('.0', '')} tỷ`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.0', '')} tr`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} k`;
  }
  return `${amount} ₫`;
}

function formatFullVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export function RevenueBarChart({ trend, period }: RevenueBarChartProps) {
  const svgWidth = 760;
  const svgHeight = 260;
  const paddingLeft = 70;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 42;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxRawRevenue = Math.max(...trend.map((p) => p.revenue), 0);
  const baselineMax = maxRawRevenue > 0 ? maxRawRevenue * 1.15 : 1_000_000;
  // Round to friendly grid step
  const gridTicks = [1, 0.66, 0.33, 0];
  const totalRevenueInTrend = trend.reduce((sum, p) => sum + p.revenue, 0);
  const totalPaidOrders = trend.reduce((sum, p) => sum + p.paidCount, 0);

  const stepWidth = trend.length > 0 ? chartWidth / trend.length : chartWidth;
  const barWidth = Math.min(Math.max(stepWidth * 0.52, 10), 44);

  return (
    <div className="admin-chart-card" role="region" aria-label="Biểu đồ xu hướng doanh thu và sản lượng đơn hàng">
      <header className="admin-chart-header">
        <div>
          <h2 className="admin-chart-title">Xu hướng doanh thu & sản lượng</h2>
          <p className="admin-chart-subtitle">
            Tổng thu kỳ này: <strong>{formatFullVND(totalRevenueInTrend)}</strong> ({totalPaidOrders} đơn đã thanh toán)
          </p>
        </div>
        <div className="admin-chart-legend">
          <span className="legend-indicator bar-color" /> Doanh thu (VND)
          <span className="legend-indicator order-color" /> Đơn thành công
        </div>
      </header>

      <div className="admin-svg-chart-container">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="admin-svg-chart"
          role="img"
          aria-label={`Biểu đồ cột doanh thu theo ngày kỳ ${period}`}
        >
          {/* Horizontal Gridlines & Y-Axis labels */}
          {gridTicks.map((ratio) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const value = baselineMax * ratio;
            return (
              <g key={ratio} className="grid-row">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="var(--line, #e2e8f0)"
                  strokeDasharray={ratio === 0 ? undefined : '4 4'}
                  strokeWidth="1"
                  opacity={ratio === 0 ? 0.8 : 0.5}
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="grid-axis-text"
                  fontSize="11"
                  fill="var(--muted, #64748b)"
                >
                  {formatCompactVND(value)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {trend.map((point, index) => {
            const barHeight =
              baselineMax > 0 && point.revenue > 0
                ? Math.max((point.revenue / baselineMax) * chartHeight, 4)
                : 0;
            const x = paddingLeft + index * stepWidth + (stepWidth - barWidth) / 2;
            const y = paddingTop + chartHeight - barHeight;
            const centerX = x + barWidth / 2;
            const tooltipText = `${point.date}: ${formatFullVND(point.revenue)} · ${point.paidCount} đơn thanh toán / ${point.orderCount} tổng đơn`;

            return (
              <g key={point.date} className="chart-bar-group" tabIndex={0}>
                <title>{tooltipText}</title>

                {/* Subtle highlight column behind bar on hover */}
                <rect
                  x={paddingLeft + index * stepWidth}
                  y={paddingTop}
                  width={stepWidth}
                  height={chartHeight}
                  fill="transparent"
                  className="bar-hover-backdrop"
                />

                {/* Bar */}
                {barHeight > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    ry="4"
                    className="admin-chart-bar"
                    fill="var(--accent, #be123c)"
                  />
                )}

                {/* Order count badge on top of bar */}
                {point.paidCount > 0 && (
                  <text
                    x={centerX}
                    y={Math.max(y - 6, paddingTop + 10)}
                    textAnchor="middle"
                    className="chart-order-badge"
                    fontSize="10"
                    fontWeight="600"
                    fill="var(--ink, #0f172a)"
                  >
                    {point.paidCount}
                  </text>
                )}

                {/* X-axis date label */}
                <text
                  x={centerX}
                  y={svgHeight - 14}
                  textAnchor="middle"
                  className="chart-date-label"
                  fontSize="11"
                  fill="var(--muted, #64748b)"
                >
                  {formatDateShort(point.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
