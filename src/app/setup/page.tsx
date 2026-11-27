import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SetupStudioFooter } from '@/components/room/SetupStudioFooter';
import { RoomViewer } from '@/components/room/RoomViewer';
import { getRoomSetupBySlug, listPublishedRoomSetups } from '@/lib/room/dal';
import { generateRoomSetupJsonLd, generateRoomSetupMetadata } from '@/lib/room/seo';
import type { RoomSetupWithItems } from '@/lib/room/types';
import { SITE } from '@/lib/site';

const DEFAULT_STUDIO_ROOM: RoomSetupWithItems = {
  id: 'studio-3d-default',
  slug: 'studio-3d',
  title: 'Setup Studio 3D (Mặc định)',
  description: 'Không gian 3D tương tác sạch sẽ, sẵn sàng để bạn tự do tìm kiếm và bố trí các thiết bị theo phong cách riêng.',
  bgImageUrl: '/home/setup-goc-lam-viec-toi-gian.png',
  aspectRatio: 1.6,
  status: 'published',
  comboDiscountPct: 0,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  items: [],
  comboPricing: {
    originalTotal: 0,
    discountAmount: 0,
    finalTotal: 0,
    inStockCount: 0,
    outOfStockCount: 0,
  },
};

interface SetupPageProps {
  searchParams: Promise<{ space?: string }>;
}

export async function generateMetadata({ searchParams }: SetupPageProps): Promise<Metadata> {
  const { space } = await searchParams;
  const setups = await listPublishedRoomSetups();
  const selectedSlug = space || (setups[0]?.slug ?? 'studio-3d');
  const setup = (await getRoomSetupBySlug(selectedSlug)) || DEFAULT_STUDIO_ROOM;

  if (setup && setup.slug !== 'studio-3d') {
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
          <main className="home-main setup-studio-main" aria-busy="true">
            <p className="cart-loading" role="status">Đang tải không gian setup tương tác...</p>
          </main>
          <SetupStudioFooter />
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
  const selectedSlug = space || (setups[0]?.slug ?? 'studio-3d');
  const currentSetup =
    (await getRoomSetupBySlug(selectedSlug)) ||
    (await getRoomSetupBySlug(setups[0]?.slug ?? '')) ||
    DEFAULT_STUDIO_ROOM;

  // Mặc định khi vào trang setup (không có không gian cụ thể), không gian 3D bắt đầu hoàn toàn trống
  if (!space) {
    currentSetup.items = [];
  }

  const jsonLd = generateRoomSetupJsonLd(currentSetup);

  return (
    <div className="home-page">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="home-main setup-studio-main">
        {/* Unified Minimal Studio Header */}
        <header className="setup-studio-header" aria-labelledby="setup-studio-title">
          <div className="setup-studio-header-info">
            <div className="setup-studio-meta">
              <nav aria-label="Điều hướng trang" className="setup-breadcrumb">
                <Link href="/" className="setup-back-link">
                  ← Quay lại trang chủ
                </Link>
                <span className="setup-breadcrumb-sep" aria-hidden="true">
                  /
                </span>
                <span className="setup-breadcrumb-curr">Setup Studio 3D</span>
              </nav>
              <span className="setup-studio-badge">
                <span className="setup-studio-dot" aria-hidden="true" />
                <span>Studio 3D Trực Tiếp</span>
              </span>
            </div>

            <h1 id="setup-studio-title" className="setup-studio-h1">
              Trải Nghiệm Setup Góc Làm Việc
            </h1>
            <p className="setup-studio-desc">
              Tự do kéo thả, xoay và sắp đặt thiết bị trong không gian 3D để nhận ưu đãi combo trọn bộ.
            </p>
          </div>

          {/* Room Switcher Tabs */}
          {setups.length > 1 && (
            <div className="setup-studio-tabs-bar" role="tablist" aria-label="Chọn không gian setup">
              <span className="setup-studio-tabs-label">Chọn không gian:</span>
              <div className="setup-studio-pills">
                <Link
                  href="/setup"
                  role="tab"
                  aria-selected={!space}
                  className={`setup-studio-pill ${!space ? 'setup-studio-pill--active' : ''}`}
                >
                  <span>✦ Phòng trống (Mặc định)</span>
                </Link>
                {setups.map((s) => {
                  const isActive = space === s.slug;
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
        </header>

        {/* Interactive Room Viewer & Combo Cart */}
        <RoomViewer setup={currentSetup} />
      </main>

      <SetupStudioFooter />
    </div>
  );
}
