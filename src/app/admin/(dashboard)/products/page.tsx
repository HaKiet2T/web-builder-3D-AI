import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ProductHierarchyWorkspace } from '@/app/admin/(dashboard)/products/ProductHierarchyWorkspace';
import { listAdminProducts, listCategories } from '@/lib/catalog/dal';

export const metadata: Metadata = { title: 'Sản phẩm & media' };

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function AdminProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <section className="admin-page admin-page-wide">
      <header className="admin-page-header">
        <p className="admin-eyebrow">QUẢN TRỊ DANH MỤC & KHO HÀNG</p>
        <h1>Sản phẩm & media</h1>
        <p>Quản lý sản phẩm phân cấp theo Danh mục, Hãng cung cấp, biến thể và media Supabase Storage.</p>
      </header>
      <Suspense fallback={<ProductsLoading />}>
        <AdminProductsContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

function ProductsLoading() {
  return (
    <div className="admin-product-list" aria-busy="true" aria-label="Đang tải sản phẩm">
      <p className="admin-notice" role="status">Đang tải danh sách sản phẩm…</p>
      <div className="admin-panel admin-skeleton" />
    </div>
  );
}

async function AdminProductsContent({ searchParams }: ProductsPageProps) {
  await connection();
  const [products, categories, query] = await Promise.all([
    listAdminProducts(),
    listCategories(),
    searchParams,
  ]);
  const savedMessage = typeof query.saved === 'string'
    ? 'Đã lưu sản phẩm thành công.'
    : query.archived
      ? 'Đã lưu trữ sản phẩm.'
      : query.media === 'added'
        ? 'Đã tải media lên thành công.'
        : query.media === 'deleted'
          ? 'Đã xoá media thành công.'
          : null;

  return (
    <ProductHierarchyWorkspace
      products={products}
      categories={categories}
      savedMessage={savedMessage}
      initialCategory={typeof query.category === 'string' ? query.category : undefined}
      initialBrand={typeof query.brand === 'string' ? query.brand : undefined}
    />
  );
}
