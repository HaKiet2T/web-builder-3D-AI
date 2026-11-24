import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  generateMauSetupListJsonLd,
  generateRoomSetupJsonLd,
  generateRoomSetupMetadata,
} from '../src/lib/room/seo.ts';
import {
  trackRoomEvent,
  subscribeRoomAnalytics,
  type RoomAnalyticsEvent,
} from '../src/lib/room/analytics.ts';
import { getSampleRoomSetups } from '../src/lib/room/dal.ts';
import { SAMPLE_ROOM_ITEMS } from '../src/lib/room/sample-data.ts';
import type { RoomSetupWithItems } from '../src/lib/room/types.ts';

describe('Room Setup Builder - Optimization, SEO JSON-LD & Home Integration (Giai đoạn 5)', () => {
  const sampleSetups = getSampleRoomSetups();
  const sampleSetupWithItems: RoomSetupWithItems = {
    ...sampleSetups[0],
    items: SAMPLE_ROOM_ITEMS.filter((i) => i.setupId === sampleSetups[0].id).map((item, idx) => ({
      ...item,
      price: (idx + 1) * 2500000,
      inStock: true,
    })),
    comboPricing: {
      originalTotal: 7500000,
      discountAmount: 750000,
      finalTotal: 6750000,
      inStockCount: 3,
      outOfStockCount: 0,
    },
  };

  describe('1. Schema.org Structured Data & JSON-LD Generation', () => {
    it('generates compliant ItemList schema for /mau-setup gallery', () => {
      const jsonLd = generateMauSetupListJsonLd(sampleSetups);

      assert.strictEqual(jsonLd['@context'], 'https://schema.org');
      assert.strictEqual(jsonLd['@type'], 'ItemList');
      assert.strictEqual(jsonLd.numberOfItems, sampleSetups.length);
      assert.strictEqual(jsonLd.itemListElement.length, sampleSetups.length);

      const firstItem = jsonLd.itemListElement[0];
      assert.strictEqual(firstItem['@type'], 'ListItem');
      assert.strictEqual(firstItem.position, 1);
      assert.strictEqual(firstItem.name, sampleSetups[0].title);
      assert.strictEqual(firstItem.url, `/khong-gian/${sampleSetups[0].slug}`);
      assert.strictEqual(firstItem.image, sampleSetups[0].bgImageUrl);
    });

    it('generates Product combo schema and ItemList device schema for /khong-gian/[slug]', () => {
      const jsonLdArray = generateRoomSetupJsonLd(sampleSetupWithItems);

      assert.ok(Array.isArray(jsonLdArray));
      assert.strictEqual(jsonLdArray.length, 2);

      const productSchema = jsonLdArray[0];
      assert.strictEqual(productSchema['@context'], 'https://schema.org');
      assert.strictEqual(productSchema['@type'], 'Product');
      assert.ok(productSchema.name.includes(sampleSetupWithItems.title));
      assert.strictEqual(productSchema.sku, `COMBO-${sampleSetupWithItems.slug.toUpperCase()}`);
      assert.ok(productSchema.offers);
      assert.strictEqual(productSchema.offers['@type'], 'Offer');
      assert.strictEqual(productSchema.offers.priceCurrency, 'VND');
      assert.ok(productSchema.offers.price > 0);

      const itemListSchema = jsonLdArray[1] as {
        '@type': string;
        numberOfItems: number;
        itemListElement: Array<{
          '@type': string;
          position: number;
          item: { '@type': string; name: string; offers: { '@type': string; priceCurrency: string } };
        }>;
      };
      assert.strictEqual(itemListSchema['@type'], 'ItemList');
      assert.ok(itemListSchema.numberOfItems > 0);
      assert.ok(itemListSchema.itemListElement.length > 0);

      const firstDevice = itemListSchema.itemListElement[0];
      assert.strictEqual(firstDevice['@type'], 'ListItem');
      assert.strictEqual(firstDevice.position, 1);
      assert.strictEqual(firstDevice.item['@type'], 'Product');
      assert.ok(firstDevice.item.name);
      assert.ok(firstDevice.item.offers);
      assert.strictEqual(firstDevice.item.offers['@type'], 'Offer');
      assert.strictEqual(firstDevice.item.offers.priceCurrency, 'VND');
    });

    it('generates dynamic metadata and OpenGraph images for space pages', () => {
      const metadata = generateRoomSetupMetadata(sampleSetupWithItems, sampleSetupWithItems.slug);

      assert.ok(String(metadata.title).includes(sampleSetupWithItems.title));
      assert.strictEqual(metadata.description, sampleSetupWithItems.description);
      assert.ok(metadata.openGraph);
      assert.strictEqual(metadata.openGraph.url, `/khong-gian/${sampleSetupWithItems.slug}`);
      assert.ok(metadata.twitter);
      assert.strictEqual((metadata.twitter as { card?: string })?.card, 'summary_large_image');
    });

    it('provides fallback metadata when space is not found', () => {
      const fallbackMeta = generateRoomSetupMetadata(null, 'non-existent');
      assert.ok(String(fallbackMeta.title).includes('Không Gian Trải Nghiệm'));
      assert.ok(fallbackMeta.description);
    });
  });

  describe('2. Client Analytics & Event Tracking Engine', () => {
    it('dispatches typed room events to custom tracker handler', () => {
      const events: RoomAnalyticsEvent[] = [];
      const tracker = (ev: RoomAnalyticsEvent) => events.push(ev);

      trackRoomEvent(
        {
          type: 'room_view',
          setupSlug: 'goc-podcast',
          setupTitle: 'Nhà sáng tạo trong góc podcast',
          itemCount: 5,
          productCount: 4,
        },
        tracker
      );

      trackRoomEvent(
        {
          type: 'room_item_hover',
          setupSlug: 'goc-podcast',
          itemId: 'item-1',
          itemType: 'product',
          productId: 'prod-1',
          productName: 'Màn hình OLED',
        },
        tracker
      );

      trackRoomEvent(
        {
          type: 'room_combo_toggle',
          setupSlug: 'goc-podcast',
          itemId: 'item-1',
          selected: false,
          selectedCount: 3,
        },
        tracker
      );

      trackRoomEvent(
        {
          type: 'room_combo_add_cart',
          setupSlug: 'goc-podcast',
          productCount: 3,
          originalTotal: 25000000,
          discountAmount: 3750000,
          finalTotal: 21250000,
        },
        tracker
      );

      assert.strictEqual(events.length, 4);
      assert.strictEqual(events[0].type, 'room_view');
      assert.strictEqual(events[1].type, 'room_item_hover');
      assert.strictEqual(events[2].type, 'room_combo_toggle');
      assert.strictEqual(events[3].type, 'room_combo_add_cart');
    });

    it('subscribes and cleans up safely without throwing', () => {
      const unsubscribe = subscribeRoomAnalytics(() => {});
      assert.strictEqual(typeof unsubscribe, 'function');
      assert.doesNotThrow(() => unsubscribe());
    });
  });

  describe('3. Image Optimization & Responsive DOM Attributes', () => {
    const roomStageSrc = readFileSync('src/components/room/RoomStage.tsx', 'utf8');
    const roomViewerSrc = readFileSync('src/components/room/RoomViewer.tsx', 'utf8');
    const setupCarouselSrc = readFileSync('src/components/home/SetupCarousel.tsx', 'utf8');

    it('verifies RoomStage background uses eager priority, async decoding and sizes', () => {
      assert.match(roomStageSrc, /loading="eager"/);
      assert.match(roomStageSrc, /fetchPriority="high"/);
      assert.match(roomStageSrc, /decoding="async"/);
      assert.match(roomStageSrc, /sizes="\(max-width: 1200px\) 100vw, 1200px"/);
    });

    it('verifies RoomStage items use lazy loading, async decoding and dynamic width sizes', () => {
      assert.match(roomStageSrc, /className="room-stage-item-img"/);
      assert.match(roomStageSrc, /loading="lazy"/);
      assert.match(roomStageSrc, /decoding="async"/);
      assert.match(roomStageSrc, /sizes=\{`\(max-width: 768px\)/);
    });

    it('verifies RoomViewer dock and combo cards include optimized image sizes and decoding', () => {
      assert.match(roomViewerSrc, /className="room-dock-card-img"/);
      assert.match(roomViewerSrc, /sizes="\(max-width: 640px\) 64px, 80px"/);
      assert.match(roomViewerSrc, /className="room-combo-row-img"/);
      assert.match(roomViewerSrc, /sizes="\(max-width: 640px\) 56px, 72px"/);
    });

    it('verifies SetupCarousel applies async decoding and responsive viewport sizes', () => {
      assert.match(setupCarouselSrc, /className="setup-card-img"/);
      assert.match(setupCarouselSrc, /decoding="async"/);
      assert.match(setupCarouselSrc, /sizes="\(max-width: 768px\) 82vw, \(max-width: 1024px\) 68vw, 50vw"/);
    });
  });

  describe('4. Storefront Wiring & Home Integration', () => {
    const homePageSrc = readFileSync('src/app/page.tsx', 'utf8');
    const mauSetupSrc = readFileSync('src/app/mau-setup/page.tsx', 'utf8');
    const spaceSlugSrc = readFileSync('src/app/khong-gian/[slug]/page.tsx', 'utf8');

    it('wires dynamic room setups into SetupCarousel on the homepage', () => {
      assert.match(homePageSrc, /listPublishedRoomSetups/);
      assert.match(homePageSrc, /<SetupCarousel setups=\{publishedRooms\} \/>/);
    });

    it('embeds Schema.org ItemList JSON-LD script tag in /mau-setup', () => {
      assert.match(mauSetupSrc, /type="application\/ld\+json"/);
      assert.match(mauSetupSrc, /generateMauSetupListJsonLd\(setups\)/);
    });

    it('embeds Schema.org Product and ItemList JSON-LD script tag in /khong-gian/[slug]', () => {
      assert.match(spaceSlugSrc, /type="application\/ld\+json"/);
      assert.match(spaceSlugSrc, /generateRoomSetupJsonLd\(setup\)/);
      assert.match(spaceSlugSrc, /generateRoomSetupMetadata/);
    });
  });

  describe('5. System Rules: Strict Em Dash (U+2014) Banning', () => {
    const filesToCheck = [
      'src/lib/room/seo.ts',
      'src/lib/room/analytics.ts',
      'src/components/room/RoomStage.tsx',
      'src/components/room/RoomViewer.tsx',
      'src/components/home/SetupCarousel.tsx',
      'src/app/page.tsx',
      'src/app/mau-setup/page.tsx',
      'src/app/khong-gian/[slug]/page.tsx',
      'tests/room-setup-optimization-seo-home.test.ts',
    ];

    for (const filePath of filesToCheck) {
      it(`guarantees ${filePath} contains zero em dash characters (U+2014)`, () => {
        const content = readFileSync(filePath, 'utf8');
        assert.doesNotMatch(content, /\u2014/, `File ${filePath} must not contain em dash (U+2014)`);
      });
    }
  });
});
