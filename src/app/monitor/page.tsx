import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MonitorStorefront } from '@/components/ui/MonitorStorefront';
import { listProductsByCategory } from '@/lib/catalog/dal';
import { toMonitorProducts } from '@/lib/catalog/monitor-adapter';

export const metadata: Metadata = {
  title: 'Màn hình ROG',
  description: 'Khám phá bộ sưu tập màn hình gaming ASUS ROG với vòng sản phẩm có thể tương tác.',
};

export default function MonitorPage() {
  return (
    <Suspense fallback={<main className="home-main" aria-busy="true"><p className="cart-loading" role="status">Đang tải bộ sưu tập màn hình…</p></main>}>
      <MonitorContent />
    </Suspense>
  );
}

async function MonitorContent() {
  // The ring gallery keeps its own full-screen interaction; the data comes from
  // the shared catalogue so a monitor added in the DAL shows up here too.
  const products = toMonitorProducts(await listProductsByCategory('monitor'));

  return <MonitorStorefront products={products} />;
}