import type { Product } from '@/lib/catalog/types';
import type { SpeakerProduct } from '@/data/speakers';

/**
 * Projects a catalog Product into the SpeakerProduct view model
 * for the Acoustic Waveform & Desk Stage storefront on /speaker.
 */
export function toSpeakerProduct(product: Product): SpeakerProduct {
  const image = product.media.find((item) => item.kind === 'image');
  const firstVariant = product.variants[0];
  const isSoundbar =
    product.slug.includes('soundbar') ||
    product.name.toLowerCase().includes('soundbar');

  // Extract or derive acoustic metrics from highlights and product details
  const powerMatch = product.highlights
    .join(' ')
    .match(/(\d+)\s*(?:×\s*\d+\s*)?W/i);
  const powerWatts = powerMatch ? parseInt(powerMatch[1], 10) : 30;

  const freqHighlight = product.highlights.find((h) =>
    h.toLowerCase().includes('hz') || h.toLowerCase().includes('khz'),
  );
  const frequencyResponse = freqHighlight ?? '20 Hz - 40 kHz (Hi-Res Audio)';

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: image?.url || '/products/speaker/rog-cetra-20.svg',
    category: product.highlights[0] ?? product.name,
    summary: product.summary,
    price: firstVariant?.price ?? 0,
    compareAtPrice: firstVariant?.compareAtPrice,
    specs: product.highlights,
    sourceUrl: product.sourceUrl ?? '#',
    speakerType: isSoundbar ? 'soundbar' : 'bookshelf',
    powerWatts,
    frequencyResponse,
    driverConfiguration: isSoundbar
      ? 'Dual Full-Range Drivers + Dual Passive Radiators'
      : '0.75" Silk Dome Tweeter + 3" Composite Woofer',
    connectivity: ['Bluetooth 5.3', 'USB-C Audio', '3.5 mm AUX', 'Optical'],
  };
}

export function toSpeakerProducts(products: Product[]): SpeakerProduct[] {
  return products.map(toSpeakerProduct);
}
