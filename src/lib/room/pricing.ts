import type { Product, Variant } from '@/lib/catalog/types';
import type { ComboPricing, RoomItem } from '@/lib/room/types';

export function hydrateRoomItems(
  items: RoomItem[],
  products: Product[],
): RoomItem[] {
  const productMap = new Map<string, Product>();
  for (const p of products) {
    productMap.set(p.id, p);
    productMap.set(p.slug, p);
  }

  return items.map((item) => {
    if (item.itemType === 'decor') {
      return {
        ...item,
        resolvedImageUrl: item.customImageUrl || '',
        inStock: true,
      };
    }

    const product = item.productId ? productMap.get(item.productId) ?? null : null;
    let variant: Variant | null = null;
    if (product) {
      if (item.variantId) {
        variant =
          product.variants.find(
            (v) => v.id === item.variantId || v.slug === item.variantId,
          ) ?? null;
      }
      if (!variant && product.variants.length > 0) {
        variant = product.variants[0];
      }
    }

    const price = variant?.price ?? product?.priceFrom ?? 0;
    const compareAtPrice = variant?.compareAtPrice ?? null;
    const inStock = variant
      ? variant.stockStatus !== 'out-of-stock'
      : product
        ? product.purchasable
        : false;

    const modelMedia = product?.media?.find((m) => m.kind === 'model');
    const customImageUrl =
      item.customImageUrl ||
      modelMedia?.url ||
      null;

    const resolvedImageUrl =
      (item.resolvedImageUrl && !item.resolvedImageUrl.endsWith('.glb'))
        ? item.resolvedImageUrl
        : product?.media?.find((m) => m.kind === 'image')?.url ||
          product?.media?.[0]?.url ||
          '';

    return {
      ...item,
      product,
      variant,
      price,
      compareAtPrice,
      inStock,
      customImageUrl,
      resolvedImageUrl,
    };
  });
}

export function calculateComboPricing(
  items: RoomItem[],
  discountPct: number,
): ComboPricing {
  const productItems = items.filter(
    (item) => item.itemType === 'product' && (item.price ?? 0) > 0,
  );
  const originalTotal = productItems.reduce(
    (acc, item) => acc + (item.price ?? 0),
    0,
  );
  const normalizedDiscount = Math.max(0, Math.min(100, discountPct));
  const discountAmount = Math.round(originalTotal * (normalizedDiscount / 100));
  const finalTotal = Math.max(0, originalTotal - discountAmount);
  const inStockCount = productItems.filter((item) => item.inStock !== false).length;
  const outOfStockCount = productItems.filter((item) => item.inStock === false).length;

  return {
    originalTotal,
    discountAmount,
    finalTotal,
    inStockCount,
    outOfStockCount,
  };
}
