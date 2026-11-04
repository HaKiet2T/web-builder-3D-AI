import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { countProductsByCategory, listCategories } from '@/lib/catalog/dal';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: SITE.tagline,
  description: SITE.description,
};

function formatCount(count: number) {
  return count === 0 ? 'Đang cập nhật' : `${count} mẫu`;
}

export default async function HomePage() {
  // Counts come from the catalogue, so the home index never claims a category is
  // empty when the DAL has products for it.
  const [counts, categories] = await Promise.all([
    countProductsByCategory(),
    listCategories(),
  ]);

  return (
    <div className="home-page">
      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <h1 id="home-title">Chọn thiết bị</h1>
          <p className="home-intro">
            Năm nhóm thiết bị cho một góc máy, chung một giỏ hàng và một luồng thanh toán.
          </p>
        </section>

        <ul className="home-index">
          {categories.map((category) => (
            <li key={category.id}>
              <Link className="home-row" href={`/${category.slug}`}>
                <span className="home-row-name">{category.name}</span>
                <span className="home-row-description">{category.description}</span>
                <span className="home-row-tail">
                  <span className="home-row-meta">{formatCount(counts[category.id] ?? 0)}</span>
                  <span className="home-row-arrow" aria-hidden="true">
                    ↗
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />
    </div>
  );
}
