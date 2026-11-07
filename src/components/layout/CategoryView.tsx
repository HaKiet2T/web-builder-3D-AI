import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';
import type { Category, Product } from '@/lib/catalog/types';

export function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

const STOCK_LABEL: Record<Product['variants'][number]['stockStatus'], string> = {
  'in-stock': 'Còn hàng',
  preorder: 'Đặt trước',
  'out-of-stock': 'Hết hàng',
};

export function stockLabel(status: Product['variants'][number]['stockStatus']) {
  return STOCK_LABEL[status];
}

interface CategoryViewProps {
  category: Category;
  products: Product[];
  /** Total products across the store, used by the empty state. */
  otherCategories: Category[];
}

export function CategoryView({ category, products, otherCategories }: CategoryViewProps) {
  return (
    <div className="home-page">
      <main className="home-main">
        <section className="home-hero" aria-labelledby="category-title">
          <Link className="page-back-link" href="/">
            ← Tất cả thiết bị
          </Link>
          <h1 id="category-title">{category.name}</h1>
          <p className="home-intro">{category.description}</p>
        </section>

        {products.length === 0 ? (
          <div className="page-empty">
            <p>Nhóm này chưa có sản phẩm.</p>
            {otherCategories.length > 0 ? (
              <p>
                Xem các nhóm khác:{' '}
                {otherCategories.map((other, index) => (
                  <span key={other.id}>
                    {index > 0 ? ', ' : null}
                    <Link className="page-inline-link" href={`/${other.slug}`}>
                      {other.name}
                    </Link>
                  </span>
                ))}
                .
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="product-grid">
            {products.map((product) => {
              const cover = product.media.find((item) => item.kind === 'image');
              const defaultVariant = product.variants[0];

              return (
                <li key={product.id}>
                  <Link className="product-card" href={`/${category.slug}/${product.slug}`}>
                    <span className="product-card-media" aria-hidden={cover ? undefined : 'true'}>
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.url} alt={cover.alt} loading="lazy" decoding="async" />
                      ) : (
                        <span className="product-card-placeholder">{product.brand}</span>
                      )}
                    </span>
                    <span className="product-card-body">
                      <span className="product-card-category">{product.highlights[0]}</span>
                      <span className="product-card-name">{product.name}</span>
                      <span className="product-card-tail">
                        <span className="product-card-price">
                          Từ {formatPrice(product.priceFrom)}
                        </span>
                        {defaultVariant ? (
                          <span
                            className="product-card-stock"
                            data-stock={defaultVariant.stockStatus}
                          >
                            {stockLabel(defaultVariant.stockStatus)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}