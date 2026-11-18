import Link from 'next/link';
import type { SalesPeriod } from '@/lib/admin/analytics-schema';

interface PeriodFilterBarProps {
  currentPeriod: SalesPeriod;
}

const PERIOD_OPTIONS: Array<{ id: SalesPeriod; label: string; hint: string }> = [
  { id: 'today', label: 'Hôm nay', hint: 'Dữ liệu phát sinh trong ngày' },
  { id: '7d', label: '7 ngày qua', hint: 'Kỳ 7 ngày gần nhất' },
  { id: '14d', label: '14 ngày qua', hint: 'Kỳ 2 tuần gần nhất' },
  { id: '30d', label: '30 ngày qua', hint: 'Kỳ 30 ngày gần nhất' },
  { id: 'this_month', label: 'Tháng này', hint: 'Từ ngày đầu tháng' },
];

export function PeriodFilterBar({ currentPeriod }: PeriodFilterBarProps) {
  return (
    <div className="admin-period-bar" role="region" aria-label="Bộ lọc kỳ phân tích bán hàng">
      <div className="admin-period-bar-header">
        <span className="admin-period-label">Kỳ báo cáo bán hàng:</span>
        <span className="admin-period-active-hint">
          {PERIOD_OPTIONS.find((p) => p.id === currentPeriod)?.hint ?? 'Kỳ phân tích'}
        </span>
      </div>
      <div className="admin-period-options" role="tablist">
        {PERIOD_OPTIONS.map((option) => {
          const isActive = option.id === currentPeriod;
          return (
            <Link
              key={option.id}
              href={`/admin?period=${option.id}`}
              role="tab"
              aria-selected={isActive}
              className={`admin-period-pill ${isActive ? 'is-active' : ''}`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
