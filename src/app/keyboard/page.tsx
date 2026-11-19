import type { Metadata } from 'next';
import { Suspense } from 'react';
import { KeyboardStorefront } from '@/components/ui/KeyboardStorefront';
import { listProductsByCategory } from '@/lib/catalog/dal';
import './keyboard.css';

export const metadata: Metadata = {
  title: 'Bàn phím cơ Custom & Gaming | E-commerce 3D',
  description:
    'Khám phá bộ sưu tập bàn phím cơ cao cấp từ 60%, 65%, 75% đến TKL với switch từ tính Rapid Trigger và Double Gasket Mount.',
};

export default function KeyboardPage() {
  return (
    <Suspense
      fallback={
        <main className="home-main" aria-busy="true">
          <p className="cart-loading" role="status">
            Đang tải bộ sưu tập bàn phím...
          </p>
        </main>
      }
    >
      <KeyboardContent />
    </Suspense>
  );
}

async function KeyboardContent() {
  const products = await listProductsByCategory('keyboard');
  return <KeyboardStorefront products={products} />;
}
