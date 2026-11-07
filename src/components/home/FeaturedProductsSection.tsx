import Link from 'next/link';
import type { ProductWithVariant } from '@/lib/catalog/types';

interface FeaturedProductsSectionProps {
  products: ProductWithVariant[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

export function FeaturedProductsSection({ products }: FeaturedProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="featured-products-section" aria-labelledby="featured-products-title">
      <div className="section-header-flex">
        <div>
          <span className="section-eyebrow">SẢN PHẨM NỔI BẬT</span>
          <h2 id="featured-products-title" className="section-title">
            Top Thiết Bị Bán Chạy
          </h2>
          <p className="section-subtitle">
            Những sản phẩm được cộng đồng người dùng và chuyên gia setup đánh giá cao nhất.
          </p>
        </div>

        <Link href="/top-san-pham" className="section-view-all-link">
          Xem tất cả <span aria-hidden="true">→</span>
        </Link>
      </div>

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
  );
}
