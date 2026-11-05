import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { HomeHeroBanner } from '@/components/home/HomeHeroBanner';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection';
import { SetupCarousel } from '@/components/home/SetupCarousel';
import { BrandFeatures } from '@/components/home/BrandFeatures';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { countProductsByCategory, listCategories, listFeaturedProducts } from '@/lib/catalog/dal';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `${SITE.name} | ${SITE.tagline}`,
  description: SITE.description,
};

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeLoading() {
  return (
    <div className="home-page">
      <main className="home-main" aria-busy="true">
        <div className="home-hero">
          <h1>Thiết bị setup góc làm việc</h1>
          <p className="cart-loading" role="status">Đang tải trang chủ…</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function HomeContent() {
  const [counts, categories, featuredProducts] = await Promise.all([
    countProductsByCategory(),
    listCategories(),
    listFeaturedProducts(6),
  ]);

  return (
    <div className="home-page">
      <main className="home-main">
        <div className="home-container">
          {/* Hero 1 (-> /mau-setup) & Hero 2, 3 (-> /top-san-pham) */}
          <HomeHeroBanner />

          {/* Hệ sinh thái danh mục sản phẩm */}
          <CategoryShowcase categories={categories} counts={counts} />

          {/* Top sản phẩm nổi bật bán chạy */}
          <FeaturedProductsSection products={featuredProducts} />

          {/* Không gian trải nghiệm 3 ảnh kéo ngang */}
          <SetupCarousel />

          {/* Cam kết thương hiệu chuẩn HyperWork */}
          <BrandFeatures />

          {/* Bản tin & tư vấn góc làm việc */}
          <NewsletterSection />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
