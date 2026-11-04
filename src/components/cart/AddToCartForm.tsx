'use client';

import { useId, useState } from 'react';
import { useCartStore } from '@/store/cart';
import { stockLabel } from '@/components/layout/CategoryView';
import type { Product } from '@/lib/catalog/types';

interface AddToCartFormProps {
  product: Product;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

export function AddToCartForm({ product }: AddToCartFormProps) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [announcement, setAnnouncement] = useState('');
  const addItem = useCartStore((state) => state.addItem);
  const ids = useId();

  const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
  const purchasable = variant && variant.stockStatus !== 'out-of-stock';
  const maxQuantity =
    variant?.stockStatus === 'in-stock' ? Math.max(1, variant.stockQuantity) : 99;

  if (!variant) {
    return <p className="page-empty">Sản phẩm này hiện chưa có lựa chọn nào.</p>;
  }

  const onAdd = () => {
    addItem({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantName: variant.name,
      imageUrl: product.media.find((item) => item.kind === 'image')?.url ?? null,
      unitPrice: variant.price,
      stockStatus: variant.stockStatus,
      quantity,
    });
    setAnnouncement(`Đã thêm ${quantity} × ${product.name} (${variant.name}) vào giỏ hàng.`);
  };

  return (
    <div className="add-to-cart">
      {product.variants.length > 1 ? (
        <fieldset className="add-to-cart-variants">
          <legend>Lựa chọn</legend>
          <div className="add-to-cart-options">
            {product.variants.map((option) => {
              const disabled = option.stockStatus === 'out-of-stock';
              return (
                <label
                  key={option.id}
                  className="add-to-cart-option"
                  data-selected={option.id === variant.id}
                  data-disabled={disabled}
                >
                  <input
                    type="radio"
                    name={`${ids}-variant`}
                    value={option.id}
                    checked={option.id === variant.id}
                    disabled={disabled}
                    onChange={() => setVariantId(option.id)}
                  />
                  <span>{option.name}</span>
                  <span className="add-to-cart-option-price">{formatPrice(option.price)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="add-to-cart-row">
        <label className="add-to-cart-quantity">
          <span>Số lượng</span>
          <input
            type="number"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              setQuantity(Number.isFinite(next) ? Math.min(maxQuantity, Math.max(1, next)) : 1);
            }}
          />
        </label>

        <button
          className="add-to-cart-button"
          type="button"
          onClick={onAdd}
          disabled={!purchasable}
        >
          {purchasable ? `Thêm vào giỏ · ${formatPrice(variant.price * quantity)}` : 'Hết hàng'}
        </button>
      </div>

      <p className="add-to-cart-stock" data-stock={variant.stockStatus}>
        {stockLabel(variant.stockStatus)}
        {variant.stockStatus === 'in-stock'
          ? ` · còn ${variant.stockQuantity} sản phẩm`
          : variant.stockStatus === 'preorder'
            ? ' · giao sau 14–21 ngày'
            : ''}
      </p>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}