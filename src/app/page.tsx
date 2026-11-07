import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { HomeHeroBanner } from '@/components/home/HomeHeroBanner';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection';
import { SetupCarousel } from '@/components/home/SetupCarousel';
import { KineticMarquee } from '@/components/ui/KineticMarquee';
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
      <main className="home-main home-main-fullbleed" aria-busy="true">
        <div className="home-container">
          <div className="home-hero">
            <h1>Thiết bị setup góc làm việc</h1>
            <p className="cart-loading" role="status">Đang tải trang chủ…</p>
          </div>
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
      <main className="home-main home-main-fullbleed">
        {/* 1. Hero 1 (ảnh đầu chiếm gần hết trang -> /mau-setup) & 2. Hero 2, 3 (2 ảnh cạnh nhau -> /top-san-pham) - Tràn viền tuyệt đối */}
        <HomeHeroBanner />

        {/* 3. Không gian trải nghiệm 3 ảnh cạnh nhau - Tràn viền tuyệt đối kéo lướt */}
        <SetupCarousel />

        {/* 4. Kinetic Typography Marquee: Ticker thông số công nghệ flagship 2026 */}
        <KineticMarquee />

        {/* 5. Khối nội dung có căn lề: Danh mục sản phẩm, Sản phẩm nổi bật, Cam kết thương hiệu, Bản tin */}
        <div className="home-container">
          {/* Hệ sinh thái danh mục sản phẩm (Chúng tôi có gì? / Danh mục sản phẩm) */}
          <CategoryShowcase categories={categories} counts={counts} />

          {/* Top sản phẩm nổi bật bán chạy */}
          <FeaturedProductsSection products={featuredProducts} />

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
