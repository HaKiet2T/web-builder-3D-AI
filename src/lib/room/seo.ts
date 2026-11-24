/**
 * Room Setup Builder - Structured Data & SEO Engine (Giai đoạn 5)
 * Generates Schema.org JSON-LD (ItemList, Product) and Next.js dynamic metadata.
 */

import type { Metadata } from 'next';
import type { RoomSetup, RoomSetupWithItems } from './types';
import { SITE } from '@/lib/site';

/**
 * Builds Schema.org ItemList JSON-LD for the collection gallery (/mau-setup).
 */
export function generateMauSetupListJsonLd(setups: RoomSetup[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Bộ Sưu Tập Mẫu Setup Góc Máy - ${SITE.name}`,
    description:
      'Tổng hợp các giải pháp phối ghép bàn nâng hạ, màn hình, phụ kiện và không gian công thái học thực tế.',
    numberOfItems: setups.length,
    itemListElement: setups.map((setup, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: setup.title,
      description: setup.description,
      url: `/khong-gian/${setup.slug}`,
      image: setup.bgImageUrl,
    })),
  };
}

/**
 * Builds Schema.org JSON-LD for an individual room space (/khong-gian/[slug]).
 * Includes ItemList for included catalog products and Product schema for the combo pack.
 */
export function generateRoomSetupJsonLd(setup: RoomSetupWithItems) {
  const items = setup.items || [];
  const productItems = items.filter((item) => item.itemType === 'product');

  const productListElements = productItems.map((item, index) => {
    const imageUrl =
      item.resolvedImageUrl ||
      item.customImageUrl ||
      item.product?.media?.[0]?.url ||
      setup.bgImageUrl;

    return {
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: item.product?.name || item.label || 'Sản phẩm setup',
        image: imageUrl,
        description: item.product?.description || `${item.label} trong góc setup ${setup.title}`,
        offers: {
          '@type': 'Offer',
          price: item.price ?? 0,
          priceCurrency: 'VND',
          availability:
            item.inStock !== false
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        },
      },
    };
  });

  // Calculate pricing estimates for the combo pack
  const totalPrice = productItems.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const discountMultiplier =
    setup.comboDiscountPct > 0 ? (100 - setup.comboDiscountPct) / 100 : 1;
  const comboPrice = Math.round(totalPrice * discountMultiplier);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `Combo Góc Setup: ${setup.title}`,
      description: setup.description,
      image: setup.bgImageUrl,
      sku: `COMBO-${setup.slug.toUpperCase()}`,
      category: 'Setup Showcase & Workspace Bundles',
      offers: {
        '@type': 'Offer',
        price: comboPrice > 0 ? comboPrice : totalPrice,
        priceCurrency: 'VND',
        availability:
          productItems.some((i) => i.inStock !== false)
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        priceValidUntil: '2026-12-31',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Danh sách thiết bị trong ${setup.title}`,
      numberOfItems: productItems.length,
      itemListElement: productListElements,
    },
  ];
}

/**
 * Generates comprehensive Next.js Metadata for room setup pages.
 */
export function generateRoomSetupMetadata(
  setup: RoomSetup | null,
  slug: string
): Metadata {
  if (!setup) {
    return {
      title: `Không Gian Trải Nghiệm | Mẫu Setup ${SITE.name}`,
      description:
        'Khám phá giải pháp phối ghép góc làm việc công thái học và phòng sáng tạo nội dung từ HGK.',
    };
  }

  const pageTitle = `${setup.title} | Mẫu Setup ${SITE.name}`;
  const pageDescription = setup.description;
  const canonicalUrl = `/khong-gian/${slug}`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: canonicalUrl,
      type: 'website',
      images: setup.bgImageUrl
        ? [
            {
              url: setup.bgImageUrl,
              width: 1200,
              height: 750,
              alt: setup.title,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: setup.bgImageUrl ? [setup.bgImageUrl] : [],
    },
  };
}
