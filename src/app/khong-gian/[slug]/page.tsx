import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { RoomViewer } from '@/components/room/RoomViewer';
import { getRoomSetupBySlug, getSampleRoomSetups } from '@/lib/room/dal';
import { generateRoomSetupJsonLd, generateRoomSetupMetadata } from '@/lib/room/seo';

interface SpacePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  const setups = getSampleRoomSetups();
  return setups.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: SpacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const setup =
    (await getRoomSetupBySlug(slug)) ||
    getSampleRoomSetups().find((s) => s.slug === slug) ||
    null;

  return generateRoomSetupMetadata(setup, slug);
}

export default function SpaceDetailPage({ params }: SpacePageProps) {
  return (
    <Suspense
      fallback={
        <div className="home-page">
          <main className="home-main" aria-busy="true">
            <p className="cart-loading" role="status">Đang tải không gian trải nghiệm...</p>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <SpaceDetailContent params={params} />
    </Suspense>
  );
}

async function SpaceDetailContent({ params }: SpacePageProps) {
  const { slug } = await params;
  const setup = await getRoomSetupBySlug(slug);

  if (!setup) {
    notFound();
  }

  const jsonLd = generateRoomSetupJsonLd(setup);

  return (
    <div className="home-page">
      {/* Schema.org Structured Data (Product & ItemList) */}
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
          <Link href="/mau-setup" className="breadcrumb-link">
            Mẫu setup
          </Link>
          <span className="breadcrumb-separator" aria-hidden="true">
            /
          </span>
          <span className="breadcrumb-current">{setup.title}</span>
        </nav>

        {/* Page Header */}
        <header className="home-hero" aria-labelledby="space-detail-title">
          <span className="section-eyebrow">KHÔNG GIAN TIÊU BIỂU</span>
          <h1 id="space-detail-title">{setup.title}</h1>
          <p className="home-intro">{setup.description}</p>
        </header>

        {/* Interactive Room Viewer & Combo Cart */}
        <RoomViewer setup={setup} />
      </main>

      <SiteFooter />
    </div>
  );
}
