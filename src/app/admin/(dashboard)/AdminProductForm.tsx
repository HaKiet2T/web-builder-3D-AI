'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { saveProductAction } from '@/app/admin/(dashboard)/actions';
import type { AdminFormState } from '@/app/admin/(dashboard)/actions';
import type { Category } from '@/lib/catalog/types';
import type { AdminProduct } from '@/lib/catalog/dal';

type EditableVariant = {
  id?: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stockStatus: 'in-stock' | 'preorder' | 'out-of-stock';
  stockQuantity: number;
  optionsText: string;
};

interface AdminProductFormProps {
  categories: Category[];
  product?: AdminProduct;
}

function toOptionsText(options: Record<string, string>) {
  return Object.entries(options).map(([key, value]) => `${key}=${value}`).join(', ');
}

function initialVariants(product?: AdminProduct): EditableVariant[] {
  if (product?.variants.length) {
    return product.variants.map((variant) => ({
      id: variant.id,
      slug: variant.slug,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      stockStatus: variant.stockStatus,
      stockQuantity: variant.stockQuantity,
      optionsText: toOptionsText(variant.options),
    }));
  }

  return [{
    slug: 'mac-dinh',
    name: 'Mặc định',
    sku: '',
    price: 0,
    compareAtPrice: null,
    stockStatus: 'in-stock',
    stockQuantity: 0,
    optionsText: '',
  }];
}

function parseOptions(value: string) {
  return Object.fromEntries(
    value.split(',').map((entry) => entry.trim()).filter(Boolean).flatMap((entry) => {
      const separator = entry.indexOf('=');
      if (separator < 1) return [];
      const key = entry.slice(0, separator).trim();
      const optionValue = entry.slice(separator + 1).trim();
      return key && optionValue ? [[key, optionValue]] : [];
    }),
  );
}

function hasValidOptions(value: string) {
  return value.trim() === '' || value.split(',').every((entry) => {
    const separator = entry.indexOf('=');
    return separator > 0 && entry.slice(separator + 1).trim().length > 0;
  });
}

export function AdminProductForm({ categories, product }: AdminProductFormProps) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(saveProductAction, {});
  const [variants, setVariants] = useState(() => initialVariants(product));
  const hasInvalidOptions = variants.some((variant) => !hasValidOptions(variant.optionsText));
  const serializedVariants = JSON.stringify(variants.map(({ optionsText, ...variant }) => ({
    ...variant,
    options: parseOptions(optionsText),
  })));

  function updateVariant(index: number, patch: Partial<EditableVariant>) {
    setVariants((current) => current.map((variant, itemIndex) =>
      itemIndex === index ? { ...variant, ...patch } : variant,
    ));
  }

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
          <select name="categoryId" required defaultValue={product?.categoryId ?? categories[0]?.id}>
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

      <section className="admin-variants" aria-labelledby={`variants-title-${product?.id ?? 'new'}`}>
        <div className="admin-variants-heading">
          <div>
            <h3 id={`variants-title-${product?.id ?? 'new'}`}>Biến thể</h3>
            <p className="admin-help">Thêm cấu hình, SKU, giá và tồn kho cho sản phẩm.</p>
          </div>
          <button
            className="admin-button"
            type="button"
            onClick={() => setVariants((current) => [...current, {
              slug: `bien-the-${current.length + 1}`,
              name: '',
              sku: '',
              price: 0,
              compareAtPrice: null,
              stockStatus: 'in-stock',
              stockQuantity: 0,
              optionsText: '',
            }])}
          >
            Thêm biến thể
          </button>
        </div>
        <input type="hidden" name="variants" value={serializedVariants} />
        <div className="admin-variant-list">
          {variants.map((variant, index) => (
            <fieldset className="admin-variant-card" key={variant.id ?? `new-${index}`}>
              <legend>Biến thể {index + 1}</legend>
              <div className="admin-form-grid">
                <label>
                  Tên biến thể
                  <input required value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} />
                </label>
                <label>
                  Slug biến thể
                  <input required value={variant.slug} onChange={(event) => updateVariant(index, { slug: event.target.value })} />
                </label>
                <label>
                  SKU
                  <input required value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value })} />
                </label>
                <label>
                  Giá bán (₫)
                  <input type="number" min="0" step="1" required value={variant.price} onChange={(event) => updateVariant(index, { price: event.target.valueAsNumber || 0 })} />
                </label>
                <label>
                  Giá niêm yết (₫)
                  <input type="number" min="0" step="1" value={variant.compareAtPrice ?? ''} onChange={(event) => updateVariant(index, { compareAtPrice: event.target.value === '' ? null : event.target.valueAsNumber })} />
                </label>
                <label>
                  Tình trạng kho
                  <select value={variant.stockStatus} onChange={(event) => updateVariant(index, { stockStatus: event.target.value as EditableVariant['stockStatus'] })}>
                    <option value="in-stock">Có sẵn</option>
                    <option value="preorder">Đặt trước</option>
                    <option value="out-of-stock">Hết hàng</option>
                  </select>
                </label>
                <label>
                  Số lượng tồn
                  <input type="number" min="0" step="1" required value={variant.stockQuantity} onChange={(event) => updateVariant(index, { stockQuantity: event.target.valueAsNumber || 0 })} />
                </label>
                <label>
                  Tuỳ chọn (dạng Tên=Giá trị, phân cách bằng dấu phẩy)
                  <input value={variant.optionsText} placeholder="Màu=Đen, Kích thước=27 inch" onChange={(event) => updateVariant(index, { optionsText: event.target.value })} />
                </label>
              </div>
              {!hasValidOptions(variant.optionsText) ? (
                <p className="admin-form-error" role="alert">Nhập tuỳ chọn theo dạng Tên=Giá trị, phân cách bằng dấu phẩy.</p>
              ) : null}
              {variants.length > 1 ? (
                <button
                  className="admin-button admin-button-danger"
                  type="button"
                  onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Xoá biến thể
                </button>
              ) : null}
            </fieldset>
          ))}
        </div>
      </section>

      {state.error ? <p className="admin-form-error" role="alert">{state.error}</p> : null}
      <button className="admin-button admin-button-primary" type="submit" disabled={pending || hasInvalidOptions}>
        {pending ? 'Đang lưu…' : product ? 'Lưu sản phẩm' : 'Tạo sản phẩm'}
      </button>
    </form>
  );
}
