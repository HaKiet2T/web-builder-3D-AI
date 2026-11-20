import type { CategoryRevenueShare } from '@/lib/admin/analytics-schema';

interface CategoryShareDonutProps {
  categoryShare: CategoryRevenueShare[];
}

const CATEGORY_COLORS = [
  '#be123c', // primary crimson / accent
  '#2563eb', // royal blue
  '#059669', // emerald green
  '#d97706', // amber
  '#7c3aed', // violet
  '#475569', // slate
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

interface DonutSlice extends CategoryRevenueShare {
  color: string;
  strokeDasharray: string;
  strokeDashoffset: number;
}

function buildDonutSlices(categoryShare: CategoryRevenueShare[], circumference: number): DonutSlice[] {
  let cumulative = 0;
  return categoryShare.map((cat, idx) => {
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulative / 100) * circumference);
    cumulative += cat.percentage;
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    return {
      ...cat,
      color,
      strokeDasharray,
      strokeDashoffset,
    };
  });
}

export function CategoryShareDonut({ categoryShare }: CategoryShareDonutProps) {
  const radius = 64;
  const strokeWidth = 22;
  const center = 100;
  const circumference = 2 * Math.PI * radius;

  const totalRevenue = categoryShare.reduce((sum, item) => sum + item.revenue, 0);
  const totalItems = categoryShare.reduce((sum, item) => sum + item.itemsSold, 0);

  const slices = buildDonutSlices(categoryShare, circumference);

  return (
    <div className="admin-chart-card" role="region" aria-label="Cơ cấu doanh thu theo ngành hàng">
      <header className="admin-chart-header">
        <div>
          <h2 className="admin-chart-title">Cơ cấu doanh số ngành hàng</h2>
          <p className="admin-chart-subtitle">
            Tổng cộng: <strong>{formatVND(totalRevenue)}</strong> ({totalItems} sản phẩm đã bán)
          </p>
        </div>
      </header>

      {categoryShare.length === 0 ? (
        <p className="admin-empty-state">Chưa có dữ liệu bán hàng cho kỳ này.</p>
      ) : (
        <div className="admin-donut-layout">
          {/* SVG Donut */}
          <div className="admin-donut-wrapper">
            <svg
              viewBox="0 0 200 200"
              className="admin-donut-svg"
              role="img"
              aria-label="Biểu đồ tròn tỷ trọng doanh thu theo danh mục"
            >
              {/* Background circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="var(--line, #e2e8f0)"
                strokeWidth={strokeWidth}
                opacity={0.4}
              />
              {/* Donut Segments */}
              {slices.map((slice) => (
                <circle
                  key={slice.categoryId}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${center} ${center})`}
                  className="donut-segment"
                >
                  <title>
                    {`${slice.categoryName}: ${formatVND(slice.revenue)} (${slice.percentage.toFixed(1)}%)`}
                  </title>
                </circle>
              ))}
              {/* Center text */}
              <text
                x={center}
                y={center - 4}
                textAnchor="middle"
                className="donut-center-title"
                fontSize="12"
                fill="var(--muted, #64748b)"
              >
                Ngành hàng
              </text>
              <text
                x={center}
                y={center + 16}
                textAnchor="middle"
                className="donut-center-value"
                fontSize="16"
                fontWeight="700"
                fill="var(--ink, #0f172a)"
              >
                {categoryShare.length} nhóm
              </text>
            </svg>
          </div>

          {/* Breakdown legend table */}
          <div className="admin-donut-legend-table">
            {slices.map((slice) => (
              <div key={slice.categoryId} className="donut-legend-row">
                <div className="donut-legend-info">
                  <span
                    className="donut-color-dot"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <span className="donut-category-name">{slice.categoryName}</span>
                </div>
                <div className="donut-legend-stats">
                  <strong className="donut-category-revenue">{formatVND(slice.revenue)}</strong>
                  <span className="donut-category-pct">{slice.percentage.toFixed(1)}%</span>
                  <small className="donut-category-items">({slice.itemsSold} món)</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
