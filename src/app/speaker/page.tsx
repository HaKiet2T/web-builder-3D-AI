import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SpeakerStorefront } from '@/components/ui/SpeakerStorefront';
import { listProductsByCategory } from '@/lib/catalog/dal';
import { toSpeakerProducts } from '@/lib/catalog/speaker-adapter';
import './speaker.css';

export const metadata: Metadata = {
  title: 'Loa & Âm thanh để bàn | Sân khấu Âm thanh & Sóng âm trực quan',
  description:
    'Khám phá bộ sưu tập loa để bàn cao cấp từ loa kiểm âm stereo 2.0 đến soundbar gaming với sân khấu âm học và mô phỏng sóng âm trực quan sống động.',
};

export default function SpeakerPage() {
  return (
    <Suspense
      fallback={
        <main className="home-main" aria-busy="true">
          <p className="cart-loading" role="status">
            Đang tải bộ sưu tập loa và âm thanh...
          </p>
        </main>
      }
    >
      <SpeakerContent />
    </Suspense>
  );
}

async function SpeakerContent() {
  const products = toSpeakerProducts(await listProductsByCategory('speaker'));
  return <SpeakerStorefront products={products} />;
}
