import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { AdminProductForm } from '@/app/admin/(dashboard)/AdminProductForm';
import {
  deleteMediaAction,
  archiveProductAction,
  uploadMediaAction,
} from '@/app/admin/(dashboard)/actions';
import { listAdminProducts, listCategories } from '@/lib/catalog/dal';

export const metadata: Metadata = { title: 'Sản phẩm & media' };

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function AdminProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <p className="admin-eyebrow">DANH MỤC</p>
        <h1>Sản phẩm & media</h1>
        <p>Tạo sản phẩm, chỉnh biến thể và quản lý hình ảnh từ kho Supabase Storage.</p>
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
    ? 'Đã lưu sản phẩm.'
    : query.archived
      ? 'Đã lưu trữ sản phẩm.'
      : query.media === 'added'
        ? 'Đã tải media lên.'
        : query.media === 'deleted'
          ? 'Đã xoá media.'
          : null;

  return (
    <>
      {savedMessage ? <p className="admin-success" role="status">{savedMessage}</p> : null}

      <details className="admin-panel admin-create-panel">
        <summary>Tạo sản phẩm mới</summary>
        <AdminProductForm categories={categories} />
      </details>

      {products.length === 0 ? (
        <p className="admin-empty">Chưa có sản phẩm trong Supabase. Tạo sản phẩm đầu tiên ở trên.</p>
      ) : (
        <div className="admin-product-list">
          {products.map((product) => (
            <details className="admin-panel" key={product.id}>
              <summary>
                <span>{product.name}</span>
                <span className="admin-status" data-status={product.status}>{product.status}</span>
              </summary>
              <AdminProductForm categories={categories} product={product} />

              <section className="admin-media-section" aria-label={`Media của ${product.name}`}>
                <h2>Media ({product.media.length})</h2>
                {product.media.length > 0 ? (
                  <ul className="admin-media-list">
                    {product.media.map((media) => (
                      <li key={media.id}>
                        <a href={media.url} target="_blank" rel="noreferrer">{media.alt}</a>
                        <form action={deleteMediaAction}>
                          <input type="hidden" name="mediaId" value={media.id} />
                          <button className="admin-button admin-button-danger" type="submit">
                            Xoá media
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : <p className="admin-help">Chưa có media.</p>}

                <form className="admin-upload-form" action={uploadMediaAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <label>
                    Hình ảnh (JPEG, PNG hoặc WebP, tối đa 5 MB)
                    <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
                  </label>
                  <label>
                    Mô tả ảnh (alt)
                    <input name="alt" required />
                  </label>
                  <button className="admin-button" type="submit">Tải media lên</button>
                </form>
              </section>

              {product.status !== 'archived' ? (
                <form action={archiveProductAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button className="admin-button admin-button-danger" type="submit">
                    Lưu trữ sản phẩm
                  </button>
                </form>
              ) : null}
            </details>
          ))}
        </div>
      )}
    </>
  );
}
