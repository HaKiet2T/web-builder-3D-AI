import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { formatPrice, stockLabel } from '@/components/layout/CategoryView';
import type { Category, Product } from '@/lib/catalog/types';
import { AddToCartForm } from '@/components/cart/AddToCartForm';

interface ProductDetailViewProps {
  category: Category;
  product: Product;
  related: Product[];
}

export function ProductDetailView({ category, product, related }: ProductDetailViewProps) {
  const cover = product.media.find((item) => item.kind === 'image');

  return (
    <div className="home-page">
      <main className="home-main">
        <nav className="detail-breadcrumb" aria-label="Đường dẫn">
          <Link className="page-back-link" href={`/${category.slug}`}>
            ← {category.name}
          </Link>
        </nav>

        <div className="product-detail">
          <div className="product-detail-media">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.url} alt={cover.alt} decoding="async" />
            ) : (
              <span className="product-detail-placeholder" aria-hidden="true">
                {product.brand}
              </span>
            )}
          </div>

          <div className="product-detail-body">
            <p className="product-detail-brand">{product.brand}</p>
            <h1 className="product-detail-title">{product.name}</h1>
            <p className="product-detail-summary">{product.summary}</p>
            <p className="product-detail-price">
              Từ {formatPrice(product.priceFrom)}
            </p>

            <AddToCartForm product={product} />

            <section className="product-detail-specs" aria-labelledby="specs-title">
              <h2 id="specs-title">Thông số chính</h2>
              <ul>
                {product.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </section>

            <section className="product-detail-description" aria-labelledby="description-title">
              <h2 id="description-title">Mô tả</h2>
              <p>{product.description}</p>
            </section>

            {product.sourceUrl ? (
              <a
                className="page-inline-link"
                href={product.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Thông số chính thức từ {product.brand}
                <span aria-hidden="true"> ↗</span>
              </a>
            ) : null}

            {product.variants.length > 1 ? (
              <p className="product-detail-variant-note">
                {product.variants.length} lựa chọn:{' '}
                {product.variants.map((variant) => variant.name).join(', ')}.
              </p>
            ) : null}
          </div>
        </div>

        {related.length > 0 ? (
          <section className="related-products" aria-labelledby="related-title">
            <h2 id="related-title">Cùng nhóm {category.name.toLowerCase()}</h2>
            <ul className="product-grid product-grid-compact">
              {related.map((item) => (
                <li key={item.id}>
                  <Link className="product-card" href={`/${category.slug}/${item.slug}`}>
                    <span className="product-card-body">
                      <span className="product-card-name">{item.name}</span>
                      <span className="product-card-price">
                        Từ {formatPrice(item.priceFrom)}
                      </span>
                      {item.variants[0] ? (
                        <span
                          className="product-card-stock"
                          data-stock={item.variants[0].stockStatus}
                        >
                          {stockLabel(item.variants[0].stockStatus)}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}

export function assertProduct(product: Product | null): Product {
  if (!product) notFound();
  return product;
}