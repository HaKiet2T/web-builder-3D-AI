import Link from 'next/link';
import type { FulfillmentBottleneck, InventoryAlert } from '@/lib/admin/analytics-schema';

interface SalesAlertsTableProps {
  inventoryAlerts: InventoryAlert[];
  bottlenecks: FulfillmentBottleneck[];
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

export function SalesAlertsTable({ inventoryAlerts, bottlenecks }: SalesAlertsTableProps) {
  return (
    <div className="admin-alerts-layout" role="region" aria-label="Cảnh báo vận hành và tồn kho">
      {/* 1. Cảnh báo tồn kho an toàn */}
      <section className="admin-panel admin-alerts-panel" aria-label="Cảnh báo tồn kho">
        <header className="admin-panel-header">
          <div className="admin-panel-title-group">
            <h2 className="admin-panel-heading">Cảnh báo tồn kho an toàn</h2>
            <span className="admin-counter-badge warning">{inventoryAlerts.length} SKU</span>
          </div>
          <Link href="/admin/products" className="admin-panel-link">
            Quản lý kho sản phẩm →
          </Link>
        </header>

        {inventoryAlerts.length === 0 ? (
          <p className="admin-notice success">
            Tất cả sản phẩm hiện đang ở ngưỡng tồn kho an toàn.
          </p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm & Biến thể</th>
                  <th>SKU / Ngành hàng</th>
                  <th>Tồn kho</th>
                  <th>Mức cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {inventoryAlerts.map((item) => {
                  const alertBadgeClass =
                    item.alertLevel === 'critical'
                      ? 'is-critical'
                      : item.alertLevel === 'warning'
                        ? 'is-warning'
                        : 'is-preorder';
                  const alertLabel =
                    item.alertLevel === 'critical'
                      ? 'Hết / Rất thấp'
                      : item.alertLevel === 'warning'
                        ? 'Sắp hết'
                        : 'Đặt trước';

                  return (
                    <tr key={`${item.productId}-${item.variantId}`}>
                      <td>
                        <strong className="table-item-name">{item.productName}</strong>
                        <span className="table-item-variant">{item.variantName}</span>
                      </td>
                      <td>
                        <code className="table-sku-code">{item.sku}</code>
                        <span className="table-category-label">{item.categoryName}</span>
                      </td>
                      <td>
                        <strong className="table-stock-qty">{item.stockQuantity}</strong>
                        <span className="table-stock-unit">chiếc</span>
                      </td>
                      <td>
                        <span className={`table-alert-pill ${alertBadgeClass}`}>
                          {alertLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Đơn hàng cần đóng gói & nghẽn vận hành */}
      <section className="admin-panel admin-alerts-panel" aria-label="Đơn hàng chờ xử lý lâu">
        <header className="admin-panel-header">
          <div className="admin-panel-title-group">
            <h2 className="admin-panel-heading">Đơn hàng cần đóng gói & xuất kho</h2>
            <span className="admin-counter-badge danger">{bottlenecks.length} đơn</span>
          </div>
          <Link href="/admin/orders" className="admin-panel-link">
            Xem danh sách đơn hàng →
          </Link>
        </header>

        {bottlenecks.length === 0 ? (
          <p className="admin-notice success">
            Không có đơn hàng nào bị chậm trễ quá 24 giờ chưa hoàn tất.
          </p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn & Khách hàng</th>
                  <th>Chờ xử lý</th>
                  <th>Giá trị đơn</th>
                  <th>Kiện vận chuyển</th>
                </tr>
              </thead>
              <tbody>
                {bottlenecks.map((order) => (
                  <tr key={order.orderId}>
                    <td>
                      <strong className="table-order-num">#{order.orderNumber}</strong>
                      <span className="table-customer-name">{order.customerName}</span>
                    </td>
                    <td>
                      <span className="table-waiting-time">
                        {Math.round(order.hoursWaiting)} giờ
                      </span>
                      <span className="table-status-hint">
                        {order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thu tiền'}
                      </span>
                    </td>
                    <td>
                      <strong className="table-order-amount">{formatVND(order.totalAmount)}</strong>
                    </td>
                    <td>
                      {order.isSplitShipment ? (
                        <span className="table-split-pill">
                          Tách {order.packageCount} kiện
                        </span>
                      ) : (
                        <span className="table-standard-pill">Kiện đơn</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
