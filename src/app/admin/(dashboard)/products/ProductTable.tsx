'use client';

import type { Category } from '@/lib/catalog/types';
import type { AdminProduct } from '@/lib/catalog/dal';
import { archiveProductAction } from '@/app/admin/(dashboard)/actions';

interface ProductTableProps {
  products: AdminProduct[];
  categories: Category[];
  totalCount: number;
  onEditProduct: (product: AdminProduct) => void;
  onOpenMedia: (product: AdminProduct) => void;
  onAddNewProduct: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

export function ProductTable({
  products,
  categories,
  totalCount,
  onEditProduct,
  onOpenMedia,
  onAddNewProduct,
  hasActiveFilters,
  onClearFilters,
}: ProductTableProps) {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const categorySlugMap = new Map(categories.map((c) => [c.id, c.slug]));

  if (products.length === 0) {
    return (
      <div className="admin-table-card">
        <div className="admin-empty-state">
          <div className="admin-empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <p className="admin-empty-title">Không tìm thấy sản phẩm nào</p>
          <p className="admin-empty-desc">
            {hasActiveFilters
              ? 'Không có sản phẩm nào khớp với bộ lọc Danh mục, Hãng hoặc từ khóa tìm kiếm hiện tại.'
              : 'Chưa có sản phẩm nào trong hệ thống.'}
          </p>
          <div className="admin-empty-actions">
            {hasActiveFilters ? (
              <button type="button" className="admin-button" onClick={onClearFilters}>
                Xoá bộ lọc
              </button>
            ) : null}
            <button
              type="button"
              className="admin-button admin-button-primary"
              onClick={onAddNewProduct}
            >
              + Tạo sản phẩm mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-table-card">
      <div className="admin-table-header-meta">
        <div className="admin-meta-count">
          <span>
            Hiển thị <strong>{products.length}</strong> / <strong>{totalCount}</strong> sản phẩm
          </span>
          {hasActiveFilters ? (
            <span className="admin-meta-badge">Đang lọc</span>
          ) : null}
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            className="admin-link-button"
            onClick={onClearFilters}
          >
            Xoá bộ lọc
          </button>
        ) : null}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '56px' }}>Ảnh</th>
              <th>Sản phẩm & SKU</th>
              <th>Danh mục & Hãng</th>
              <th>Giá bán từ</th>
              <th>Kho & Biến thể</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right', minWidth: '170px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const primaryImage = product.media.find((m) => m.kind === 'image') ?? product.media[0];
              const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
              const hasInStock = product.variants.some(
                (v) => v.stockStatus === 'in-stock' && v.stockQuantity > 0,
              );
              const isPreorder = product.variants.some((v) => v.stockStatus === 'preorder');
              const stockStatusType = hasInStock ? 'in-stock' : isPreorder ? 'preorder' : 'out-of-stock';
              const stockStatusText = hasInStock
                ? `Còn hàng (${totalStock})`
                : isPreorder
                  ? 'Đặt trước'
                  : 'Hết hàng';

              const skuList = product.variants
                .map((v) => v.sku)
                .filter(Boolean)
                .slice(0, 2)
                .join(', ');

              const categorySlug = categorySlugMap.get(product.categoryId) ?? product.categoryId;
              const storeUrl = `/${categorySlug}/${product.slug}`;

              return (
                <tr key={product.id}>
                  {/* Thumbnail */}
                  <td>
                    <div className="admin-thumb-box">
                      {primaryImage?.url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={primaryImage.url}
                          alt={primaryImage.alt || product.name}
                          className="admin-thumb-img"
                          loading="lazy"
                        />
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          color="var(--soft)"
                          aria-hidden="true"
                        >
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      )}
                    </div>
                  </td>

                  {/* Sản phẩm & SKU */}
                  <td>
                    <div className="admin-product-cell">
                      <div className="admin-product-info">
                        <span className="admin-product-name">{product.name}</span>
                        <div className="admin-product-meta-row">
                          <a
                            href={storeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-product-slug-link"
                            title="Xem sản phẩm trên storefront"
                          >
                            /{product.slug} ↗
                          </a>
                          {skuList ? (
                            <span className="admin-sku-pill">
                              SKU: {skuList}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Phân cấp: Danh mục & Hãng */}
                  <td>
                    <div className="admin-cat-brand-cell">
                      <span className="admin-category-tag">
                        {categoryMap.get(product.categoryId) ?? product.categoryId}
                      </span>
                      <span className="admin-brand-tag">
                        {product.brand}
                      </span>
                    </div>
                  </td>

                  {/* Giá từ */}
                  <td>
                    <span className="admin-price-cell">{formatVND(product.priceFrom)}</span>
                  </td>

                  {/* Tồn kho & biến thể */}
                  <td>
                    <div className="admin-stock-cell">
                      <span className="admin-stock-badge">
                        <span className={`admin-stock-dot ${stockStatusType}`} aria-hidden="true" />
                        <span className="admin-stock-text">{stockStatusText}</span>
                      </span>
                      <span className="admin-variant-count-text">
                        {product.variants.length} biến thể
                      </span>
                    </div>
                  </td>

                  {/* Trạng thái */}
                  <td>
                    <span className={`admin-status-badge status-${product.status}`} data-status={product.status}>
                      {product.status === 'active'
                        ? 'Đang bán'
                        : product.status === 'draft'
                          ? 'Bản nháp'
                          : 'Đã lưu trữ'}
                    </span>
                  </td>

                  {/* Thao tác */}
                  <td>
                    <div className="admin-actions-cell">
                      <button
                        type="button"
                        className="admin-action-btn admin-action-edit"
                        onClick={() => onEditProduct(product)}
                        title="Chỉnh sửa thông tin và biến thể"
                      >
                        Sửa
                      </button>

                      <button
                        type="button"
                        className="admin-action-btn admin-action-media"
                        onClick={() => onOpenMedia(product)}
                        title={`Quản lý ${product.media.length} hình ảnh / media`}
                      >
                        Media ({product.media.length})
                      </button>

                      {product.status !== 'archived' ? (
                        <form
                          action={archiveProductAction}
                          style={{ display: 'inline' }}
                          onSubmit={(e) => {
                            if (!window.confirm(`Bạn có chắc muốn lưu trữ sản phẩm "${product.name}"?`)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="productId" value={product.id} />
                          <button
                            type="submit"
                            className="admin-action-btn admin-action-archive"
                            title="Lưu trữ sản phẩm này"
                          >
                            Lưu trữ
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
