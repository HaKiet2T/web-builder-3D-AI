import type { Product } from '@/lib/catalog/types';
import type { MouseProduct } from '@/data/mice';

/**
 * Projects a catalog Product into the compact MouseProduct view model
 * for the 2D orbit ring storefront on /mouse.
 */
export function toMouseProduct(product: Product): MouseProduct {
  const image = product.media.find((item) => item.kind === 'image');
  const firstVariant = product.variants[0];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: image?.url ?? '',
    category: product.highlights[0] ?? product.name,
    summary: product.summary,
    price: firstVariant?.price ?? 0,
    compareAtPrice: firstVariant?.compareAtPrice,
    specs: product.highlights,
    sourceUrl: product.sourceUrl ?? '#',
  };
}

export function toMouseProducts(products: Product[]): MouseProduct[] {
  return products.map(toMouseProduct);
}
