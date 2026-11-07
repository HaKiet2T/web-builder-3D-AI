import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { listFeaturedProducts, listCategories } from '@/lib/catalog/dal';

export const metadata: Metadata = {
  title: 'Top Sản Phẩm Nổi Bật',
  description: 'Danh sách các thiết bị setup và công nghệ bán chạy hàng đầu từ HGK.',
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

export default function TopProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="home-page">
          <main className="home-main" aria-busy="true">
            <p className="cart-loading" role="status">Đang tải top sản phẩm…</p>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <TopProductsContent />
    </Suspense>
  );
}

async function TopProductsContent() {
  const [products, categories] = await Promise.all([
    listFeaturedProducts(4),
    listCategories(),
  ]);

  return (
    <div className="home-page">
      <main className="home-main">
        <nav aria-label="Điều hướng trang" className="page-breadcrumb">
          <Link href="/" className="page-back-link">
            ← Quay lại trang chủ
          </Link>
        </nav>

        <header className="home-hero" aria-labelledby="top-products-title">
          <span className="section-eyebrow">BẢNG XẾP HẠNG THIẾT BỊ</span>
          <h1 id="top-products-title">Top Sản Phẩm Được Yêu Thích</h1>
          <p className="home-intro">
            Tổng hợp những sản phẩm có đánh giá cao nhất về hiệu năng, độ bền và thiết kế công thái học.
          </p>
        </header>

        {/* Dual Highlights */}
        <div className="hero-secondary-grid" style={{ marginBottom: 'clamp(32px, 5vw, 48px)' }}>
          <div className="hero-secondary-card" style={{ cursor: 'default' }}>
            <div className="hero-image-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/home/hero-2.png"
                alt="Thiết bị gaming và văn phòng đỉnh cao"
                className="hero-image"
              />
              <div className="hero-gradient-overlay" />
            </div>
            <div className="hero-secondary-content">
              <span className="hero-badge">Tiêu Chuẩn Gaming</span>
              <h2 className="hero-secondary-title" style={{ fontSize: 'clamp(20px, 2.4vw, 28px)' }}>
                Tốc Độ &amp; Độ Chuẩn Xác
              </h2>
              <p className="hero-secondary-desc">Màn hình tần số quét lên tới 540Hz, phản hồi 0.2ms.</p>
            </div>
          </div>

          <div className="hero-secondary-card" style={{ cursor: 'default' }}>
            <div className="hero-image-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/home/hero-3.png"
                alt="Thiết kế công thái học"
                className="hero-image"
              />
              <div className="hero-gradient-overlay" />
            </div>
            <div className="hero-secondary-content">
              <span className="hero-badge">Chuẩn Công Thái Học</span>
              <h2 className="hero-secondary-title" style={{ fontSize: 'clamp(20px, 2.4vw, 28px)' }}>
                Tối Ưu Góc Làm Việc
              </h2>
              <p className="hero-secondary-desc">Ánh sáng dịu mắt, âm thanh chi tiết cho không gian sáng tạo.</p>
            </div>
          </div>
        </div>

        {/* Category quick links */}
        <div className="top-category-tabs" aria-label="Lọc nhanh danh mục">
          <span className="top-tab-label">Xem nhanh:</span>
          {categories.map((cat) => (
            <Link key={cat.id} href={`/${cat.slug}`} className="top-tab-pill">
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Product Grid */}
        <section aria-label="Danh sách top sản phẩm">
          <div className="product-grid">
            {products.map((product) => {
              const cover = product.media.find((item) => item.kind === 'image');
              const defaultVariant = product.defaultVariant;

              return (
                <article key={product.id}>
                  <Link
                    className="product-card"
                    href={`/${product.categoryId}/${product.slug}`}
                    aria-label={`${product.name} - ${formatPrice(product.priceFrom)}`}
                  >
                    <div className="product-card-media" aria-hidden={cover ? undefined : 'true'}>
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.url}
                          alt={cover.alt || product.name}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="product-card-placeholder">{product.brand}</span>
                      )}
                    </div>

                    <div className="product-card-body">
                      <span className="product-card-category">
                        {product.highlights[0] || product.brand}
                      </span>
                      <h3 className="product-card-name">{product.name}</h3>

                      <div className="product-card-tail">
                        <span className="product-card-price">
                          Từ {formatPrice(product.priceFrom)}
                        </span>
                        {defaultVariant ? (
                          <span
                            className="product-card-stock"
                            data-stock={defaultVariant.stockStatus}
                          >
                            {defaultVariant.stockStatus === 'in-stock'
                              ? 'Còn hàng'
                              : defaultVariant.stockStatus === 'preorder'
                                ? 'Đặt trước'
                                : 'Hết hàng'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
