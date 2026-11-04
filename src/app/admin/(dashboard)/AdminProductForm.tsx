'use client';

import { useActionState } from 'react';
import { saveProductAction } from '@/app/admin/(dashboard)/actions';
import type { AdminFormState } from '@/app/admin/(dashboard)/actions';
import type { Category } from '@/lib/catalog/types';
import type { AdminProduct } from '@/lib/catalog/dal';

interface AdminProductFormProps {
  categories: Category[];
  product?: AdminProduct;
}

function initialVariants(product?: AdminProduct) {
  if (product?.variants.length) {
    return JSON.stringify(
      product.variants.map((variant) => ({
        id: variant.id,
        slug: variant.slug,
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        stockStatus: variant.stockStatus,
        stockQuantity: variant.stockQuantity,
        options: variant.options,
      })),
      null,
      2,
    );
  }

  return JSON.stringify(
    [
      {
        slug: 'mac-dinh',
        name: 'Mặc định',
        sku: '',
        price: 0,
        compareAtPrice: null,
        stockStatus: 'in-stock',
        stockQuantity: 0,
        options: {},
      },
    ],
    null,
    2,
  );
}

export function AdminProductForm({ categories, product }: AdminProductFormProps) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    saveProductAction,
    {},
  );

  return (
    <form className="admin-product-form" action={action}>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="admin-form-grid">
        <label>
          Tên sản phẩm
          <input name="name" required defaultValue={product?.name ?? ''} />
        </label>
        <label>
          Slug
          <input name="slug" required defaultValue={product?.slug ?? ''} />
        </label>
        <label>
          Danh mục
          <select name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          Thương hiệu
          <input name="brand" required defaultValue={product?.brand ?? ''} />
        </label>
        <label>
          Trạng thái
          <select name="status" defaultValue={product?.status ?? 'draft'}>
            <option value="draft">Bản nháp</option>
            <option value="active">Đang bán</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
        </label>
        <label>
          Link thông số chính thức (tuỳ chọn)
          <input name="sourceUrl" type="url" defaultValue={product?.sourceUrl ?? ''} />
        </label>
      </div>
      <label>
        Mô tả ngắn
        <input name="summary" required defaultValue={product?.summary ?? ''} />
      </label>
      <label>
        Mô tả chi tiết
        <textarea name="description" rows={3} required defaultValue={product?.description ?? ''} />
      </label>
      <label>
        Điểm nổi bật (mỗi dòng một mục)
        <textarea
          name="highlights"
          rows={3}
          required
          defaultValue={product?.highlights.join('\n') ?? ''}
        />
      </label>
      <label>
        Biến thể (JSON)
        <textarea name="variants" rows={12} required defaultValue={initialVariants(product)} />
      </label>
      <p className="admin-help">
        Mỗi biến thể gồm slug, name, sku, price, compareAtPrice, stockStatus,
        stockQuantity và options.
      </p>
      {state.error ? <p className="admin-form-error" role="alert">{state.error}</p> : null}
      <button className="admin-button admin-button-primary" type="submit" disabled={pending}>
        {pending ? 'Đang lưu…' : product ? 'Lưu sản phẩm' : 'Tạo sản phẩm'}
      </button>
    </form>
  );
}
