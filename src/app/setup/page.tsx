import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { RoomViewer } from '@/components/room/RoomViewer';
import { getRoomSetupBySlug, listPublishedRoomSetups } from '@/lib/room/dal';
import { generateRoomSetupJsonLd, generateRoomSetupMetadata } from '@/lib/room/seo';
import { SITE } from '@/lib/site';

interface SetupPageProps {
  searchParams: Promise<{ space?: string }>;
}

export async function generateMetadata({ searchParams }: SetupPageProps): Promise<Metadata> {
  const { space } = await searchParams;
  const setups = await listPublishedRoomSetups();
  const selectedSlug = space || (setups[0]?.slug ?? 'goc-lam-viec-toi-gian');
  const setup = await getRoomSetupBySlug(selectedSlug);

  if (setup) {
    return generateRoomSetupMetadata(setup, selectedSlug);
  }

  return {
    title: `Phòng Setup Studio 3D Tương Tác | ${SITE.name}`,
    description: 'Tự tay sắp xếp, kéo thả và phối ghép màn hình, loa, bàn phím và phụ kiện công thái học trong không gian làm việc thực tế.',
  };
}

export default function SetupPage({ searchParams }: SetupPageProps) {
  return (
    <Suspense
      fallback={
        <div className="home-page">
          <main className="home-main" aria-busy="true">
            <p className="cart-loading" role="status">Đang tải không gian setup tương tác...</p>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <SetupPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SetupPageContent({ searchParams }: SetupPageProps) {
  const { space } = await searchParams;
  const setups = await listPublishedRoomSetups();
  const selectedSlug = space || (setups[0]?.slug ?? 'goc-lam-viec-toi-gian');
  const currentSetup = (await getRoomSetupBySlug(selectedSlug)) || (await getRoomSetupBySlug(setups[0]?.slug ?? ''));

  if (!currentSetup) {
    return (
      <div className="home-page">
        <main className="home-main">
          <p>Không tìm thấy không gian setup yêu cầu.</p>
          <Link href="/" className="page-back-link">Quay lại trang chủ</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const jsonLd = generateRoomSetupJsonLd(currentSetup);

  return (
    <div className="home-page">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="home-main">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Điều hướng trang" className="page-breadcrumb">
          <Link href="/" className="page-back-link">
            ← Quay lại trang chủ
          </Link>
          <span className="breadcrumb-separator" aria-hidden="true">
            /
          </span>
          <span className="breadcrumb-current">Setup Studio 3D</span>
        </nav>

        {/* Page Header */}
        <header className="home-hero" aria-labelledby="setup-studio-title">
          <span className="section-eyebrow">STUDIO GÓC MÁY TƯƠNG TÁC</span>
          <h1 id="setup-studio-title">Trải Nghiệm Setup Góc Làm Việc</h1>
          <p className="home-intro">
            Dành cho khách hàng: Tự do di chuyển, sắp xếp màn hình, bàn phím, loa và phụ kiện ngay trên bàn làm việc thực tế. Tùy biến góc máy theo phong cách riêng và mua trọn bộ combo ưu đãi.
          </p>
        </header>

        {/* Room Switcher Tabs */}
        {setups.length > 1 && (
          <div className="setup-studio-tabs-bar" role="tablist" aria-label="Chọn không gian setup">
            <span className="setup-studio-tabs-label">Chọn không gian:</span>
            <div className="setup-studio-pills">
              {setups.map((s) => {
                const isActive = s.slug === currentSetup.slug;
                return (
                  <Link
                    key={s.slug}
                    href={`/setup?space=${s.slug}`}
                    role="tab"
                    aria-selected={isActive}
                    className={`setup-studio-pill ${isActive ? 'setup-studio-pill--active' : ''}`}
                  >
                    <span>{s.title}</span>
                    {s.comboDiscountPct > 0 && (
                      <span className="setup-studio-pill-tag">-{s.comboDiscountPct}%</span>
                    )}
                  </Link>
                );
              })}
            </div>
            <Link href="/mau-setup" className="setup-studio-gallery-link">
              Xem toàn bộ gallery mẫu →
            </Link>
          </div>
        )}

        {/* Interactive Room Viewer & Combo Cart */}
        <RoomViewer setup={currentSetup} />
      </main>

      <SiteFooter />
    </div>
  );
}
