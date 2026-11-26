import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { listPublishedRoomSetups } from '@/lib/room/dal';
import { generateMauSetupListJsonLd } from '@/lib/room/seo';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `Bộ Sưu Tập Mẫu Setup | ${SITE.name}`,
  description: 'Khám phá các ý tưởng phối ghép góc làm việc công thái học và giải trí hiện đại từ HGK.',
  openGraph: {
    title: `Bộ Sưu Tập Mẫu Setup | ${SITE.name}`,
    description: 'Khám phá các ý tưởng phối ghép góc làm việc công thái học và giải trí hiện đại từ HGK.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Bộ Sưu Tập Mẫu Setup | ${SITE.name}`,
    description: 'Khám phá các ý tưởng phối ghép góc làm việc công thái học và giải trí hiện đại từ HGK.',
  },
};

async function MauSetupContent() {
  const setups = await listPublishedRoomSetups();
  const featuredSetup = setups[0];
  const jsonLd = generateMauSetupListJsonLd(setups);

  return (
    <div className="home-page">
      {/* Schema.org ItemList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="home-main">
        <nav aria-label="Điều hướng trang" className="page-breadcrumb">
          <Link href="/" className="page-back-link">
            ← Quay lại trang chủ
          </Link>
        </nav>

        <header className="home-hero" aria-labelledby="mau-setup-title">
          <span className="section-eyebrow">GALLERY CẢM HỨNG</span>
          <h1 id="mau-setup-title">Mẫu Setup Góc Máy</h1>
          <p className="home-intro">
            Tổng hợp các giải pháp phối ghép bàn nâng hạ, màn hình, ghế công thái học và phụ kiện bàn làm việc thực tế từ HGK.
          </p>
        </header>

        {/* Featured Banner / Flagship Setup */}
        {featuredSetup && (
          <div className="destination-hero-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featuredSetup.bgImageUrl}
              alt={featuredSetup.title}
              className="destination-hero-img"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
            <div className="destination-hero-overlay">
              <span className="destination-hero-badge">Flagship Setup 2026</span>
              <h2 className="destination-hero-title">{featuredSetup.title}</h2>
              <p className="destination-hero-desc">{featuredSetup.description}</p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  href={`/setup?space=${featuredSetup.slug}`}
                  className="roadmap-btn primary"
                >
                  Trải nghiệm &amp; Kéo thả góc này →
                </Link>
                <Link
                  href={`/khong-gian/${featuredSetup.slug}`}
                  className="roadmap-btn secondary"
                >
                  Chi tiết combo
                </Link>
              </div>
            </div>
          </div>
        )}

        <section className="destination-section" aria-labelledby="curated-spaces-title">
          <div className="section-header">
            <span className="section-eyebrow">KHÔNG GIAN TIÊU BIỂU</span>
            <h2 id="curated-spaces-title" className="section-title">
              Các Phong Cách Setup Được Đề Xuất
            </h2>
          </div>

          <div className="setup-gallery-grid">
            {setups.map((setup) => (
              <article key={setup.slug} className="setup-gallery-card">
                <Link href={`/khong-gian/${setup.slug}`} className="setup-gallery-link">
                  <div className="setup-gallery-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setup.bgImageUrl}
                      alt={setup.title}
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="setup-gallery-img"
                    />
                    {setup.comboDiscountPct > 0 && (
                      <span className="setup-gallery-tag">
                        Ưu đãi Combo -{setup.comboDiscountPct}%
                      </span>
                    )}
                  </div>
                  <div className="setup-gallery-body">
                    <h3 className="setup-gallery-title">{setup.title}</h3>
                    <p className="setup-gallery-desc">{setup.description}</p>
                    <span className="setup-gallery-cta">
                      Tùy chọn & Mua combo →
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="roadmap-notice-box" role="status">
          <span className="roadmap-notice-badge">Thông tin phát triển</span>
          <h3 className="roadmap-notice-title">Bộ công cụ Desk Builder tương tác trực tiếp</h3>
          <p className="roadmap-notice-desc">
            Tính năng tùy biến góc setup trực tiếp trong không gian tương tác với danh mục sản phẩm của {SITE.name} đã sẵn sàng.
          </p>
          <div className="roadmap-notice-actions">
            <Link href="/setup" className="roadmap-btn primary">
              Vào phòng Setup Studio tương tác →
            </Link>
            <Link href="/" className="roadmap-btn secondary">
              Khám phá sản phẩm trang chủ
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function MauSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="home-page">
          <main className="home-main" aria-busy="true">
            <p className="cart-loading" role="status">Đang tải bộ sưu tập mẫu setup...</p>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <MauSetupContent />
    </Suspense>
  );
}
