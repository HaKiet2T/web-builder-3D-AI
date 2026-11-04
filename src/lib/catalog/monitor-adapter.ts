import type { Product } from '@/lib/catalog/types';
import type { MonitorProduct } from '@/data/monitors';

/**
 * The ring gallery predates the shared catalogue and expects the compact
 * `MonitorProduct` view model (flat image string, spec bullets, source link).
 * Rather than rewrite the verified orbit implementation, catalogue products are
 * projected onto that view model here — one adapter, one place to maintain.
 */
export function toMonitorProduct(product: Product): MonitorProduct {
  const image = product.media.find((item) => item.kind === 'image');

  return {
    id: product.id,
    name: product.name,
    image: image?.url ?? '',
    category: product.highlights[0] ?? product.name,
    specs: product.highlights,
    sourceUrl: product.sourceUrl ?? '#',
  };
}

export function toMonitorProducts(products: Product[]): MonitorProduct[] {
  return products.map(toMonitorProduct);
}