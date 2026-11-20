import type { PaymentMethodDistribution } from '@/lib/admin/analytics-schema';

interface PaymentMethodDistributionCardProps {
  paymentDistribution: PaymentMethodDistribution[];
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

export function PaymentMethodDistributionCard({
  paymentDistribution,
}: PaymentMethodDistributionCardProps) {
  const totalAmount = paymentDistribution.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="admin-chart-card" role="region" aria-label="Phân bổ phương thức thanh toán">
      <header className="admin-chart-header">
        <div>
          <h2 className="admin-chart-title">Phương thức thanh toán</h2>
          <p className="admin-chart-subtitle">
            Tổng thanh toán: <strong>{formatVND(totalAmount)}</strong> (VietQR chuyển khoản vs COD)
          </p>
        </div>
      </header>

      {paymentDistribution.length === 0 ? (
        <p className="admin-empty-state">Chưa phát sinh giao dịch thanh toán trong kỳ.</p>
      ) : (
        <div className="admin-payment-list">
          {/* Stacked comparison progress bar */}
          <div className="admin-payment-bar" role="progressbar" aria-label="Tỷ lệ thanh toán">
            {paymentDistribution.map((method) => {
              const segmentClass = method.method === 'vietqr' ? 'segment-vietqr' : 'segment-cod';
              return (
                <div
                  key={method.method}
                  className={`admin-payment-segment ${segmentClass}`}
                  style={{ width: `${Math.max(method.percentage, 4)}%` }}
                  title={`${method.label}: ${method.percentage.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* Details list */}
          <div className="admin-payment-items">
            {paymentDistribution.map((item) => (
              <article key={item.method} className="admin-payment-item">
                <div className="payment-item-header">
                  <span className={`payment-pill ${item.method === 'vietqr' ? 'is-vietqr' : 'is-cod'}`}>
                    {item.label}
                  </span>
                  <span className="payment-pct">{item.percentage.toFixed(1)}%</span>
                </div>
                <div className="payment-item-body">
                  <strong className="payment-amount">{formatVND(item.totalAmount)}</strong>
                  <span className="payment-count">{item.orderCount} đơn hàng</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
