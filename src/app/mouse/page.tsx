import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MouseStorefront } from '@/components/ui/MouseStorefront';
import { listProductsByCategory } from '@/lib/catalog/dal';
import { toMouseProducts } from '@/lib/catalog/mouse-adapter';
import './mouse.css';

export const metadata: Metadata = {
  title: 'Chuột ROG - Bộ sưu tập Chuột Gaming ASUS ROG',
  description:
    'Khám phá bộ sưu tập chuột gaming ASUS ROG siêu nhẹ với vòng xoay sản phẩm 2D tương tác mượt mà.',
};

export default function MousePage() {
  return (
    <Suspense
      fallback={
        <main className="home-main" aria-busy="true">
          <p className="cart-loading" role="status">
            Đang tải bộ sưu tập chuột gaming...
          </p>
        </main>
      }
    >
      <MouseContent />
    </Suspense>
  );
}

async function MouseContent() {
  // Sân khấu vòng xoay 2D lấy dữ liệu từ danh mục chung
  const products = toMouseProducts(await listProductsByCategory('mouse'));

  return <MouseStorefront products={products} />;
}
