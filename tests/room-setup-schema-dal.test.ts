import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { PRODUCT_RECORDS } from '../src/lib/catalog/sample-data.ts';
import {
  calculateComboPricing,
  getSampleRoomSetupBySlug,
  getSampleRoomSetups,
  hydrateRoomItems,
  listPublishedRoomSetups,
  getRoomSetupBySlug,
} from '../src/lib/room/dal.ts';
import { SAMPLE_ROOM_ITEMS, SAMPLE_ROOM_SETUPS } from '../src/lib/room/sample-data.ts';
import {
  RoomItemSchema,
  RoomSetupInputSchema,
} from '../src/lib/room/schema.ts';
import type { RoomItem } from '../src/lib/room/types.ts';

const typesContent = readFileSync('src/lib/supabase/database.types.ts', 'utf8');
const migrationSql = readFileSync(
  'supabase/migrations/20261125000000_room_setup_builder.sql',
  'utf8',
);
const dalContent = readFileSync('src/lib/room/dal.ts', 'utf8');
const schemaContent = readFileSync('src/lib/room/schema.ts', 'utf8');
const typesFileContent = readFileSync('src/lib/room/types.ts', 'utf8');
const sampleDataContent = readFileSync('src/lib/room/sample-data.ts', 'utf8');

describe('Room Setup Builder Schema, Migration & DAL (Giai doan 1)', () => {
  describe('Supabase Database Types Integration', () => {
    it('enforces strict Supabase database types for room_setups and room_items', () => {
      assert.doesNotMatch(
        typesContent,
        /\[key:\s*string\]:\s*unknown/,
        'database.types.ts must maintain strict type invariant without loose index signatures',
      );

      assert.match(typesContent, /room_setups:\s*\{/);
      assert.match(typesContent, /room_items:\s*\{/);
      assert.match(typesContent, /export type RoomSetupRow = Tables<'room_setups'>;/);
      assert.match(typesContent, /export type RoomItemRow = Tables<'room_items'>;/);
      assert.match(typesContent, /export type RoomSetupStatus = 'draft' \| 'published';/);
      assert.match(typesContent, /export type RoomItemType = 'product' \| 'decor';/);
    });

    it('exposes explicit Foreign Key relationships for room_items', () => {
      assert.match(typesContent, /foreignKeyName:\s*'room_items_setup_id_fkey'/);
      assert.match(typesContent, /foreignKeyName:\s*'room_items_product_id_fkey'/);
      assert.match(typesContent, /foreignKeyName:\s*'room_items_variant_id_fkey'/);
    });
  });

  describe('SQL Migration File Verification', () => {
    it('declares room_setups table with proper types and checks', () => {
      assert.match(migrationSql, /create table if not exists public\.room_setups/i);
      assert.match(migrationSql, /slug text not null unique/i);
      assert.match(migrationSql, /aspect_ratio numeric not null default/i);
      assert.match(migrationSql, /status text not null default 'draft' check \(status in \('draft', 'published'\)\)/i);
      assert.match(migrationSql, /combo_discount_pct numeric not null default 0 check \(combo_discount_pct >= 0 and combo_discount_pct <= 100\)/i);
    });

    it('enforces item_type CHECK constraint with product and decor invariants', () => {
      assert.match(migrationSql, /create table if not exists public\.room_items/i);
      assert.match(migrationSql, /item_type text not null check \(item_type in \('product', 'decor'\)\)/i);

      // product requires product_id is not null (custom_image_url nullable)
      // decor requires product_id is null and custom_image_url is not null
      assert.match(
        migrationSql,
        /\(item_type = 'product' and product_id is not null\)\s+or\s+\(item_type = 'decor' and product_id is null and custom_image_url is not null\)/i,
      );
    });

    it('enforces exact Foreign Key ON DELETE actions (CASCADE and SET NULL)', () => {
      assert.match(migrationSql, /setup_id uuid not null references public\.room_setups\(id\) on delete cascade/i);
      assert.match(migrationSql, /product_id text references public\.products\(id\) on delete cascade/i);
      assert.match(migrationSql, /variant_id text references public\.product_variants\(id\) on delete set null/i);
    });

    it('declares room-assets storage bucket and security policies', () => {
      assert.match(migrationSql, /insert into storage\.buckets \(id, name, public/i);
      assert.match(migrationSql, /'room-assets'/i);
      assert.match(migrationSql, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/i);

      assert.match(migrationSql, /drop policy if exists "Room assets are publicly readable"/i);
      assert.match(migrationSql, /create policy "Room assets are publicly readable"/i);
      assert.match(migrationSql, /drop policy if exists "Admins upload room assets"/i);
      assert.match(migrationSql, /create policy "Admins upload room assets"/i);
      assert.match(migrationSql, /drop policy if exists "Admins update room assets"/i);
      assert.match(migrationSql, /create policy "Admins update room assets"/i);
      assert.match(migrationSql, /drop policy if exists "Admins delete room assets"/i);
      assert.match(migrationSql, /create policy "Admins delete room assets"/i);
    });

    it('declares idempotent RLS policies for room_setups and room_items', () => {
      assert.match(migrationSql, /alter table public\.room_setups enable row level security/i);
      assert.match(migrationSql, /alter table public\.room_items enable row level security/i);

      assert.match(migrationSql, /drop policy if exists "Published room setups are readable by everyone"/i);
      assert.match(migrationSql, /create policy "Published room setups are readable by everyone"/i);
      assert.match(migrationSql, /drop policy if exists "Admins manage room setups"/i);
      assert.match(migrationSql, /create policy "Admins manage room setups"/i);

      assert.match(migrationSql, /drop policy if exists "Items of published setups are readable"/i);
      assert.match(migrationSql, /create policy "Items of published setups are readable"/i);
      assert.match(migrationSql, /drop policy if exists "Admins manage room items"/i);
      assert.match(migrationSql, /create policy "Admins manage room items"/i);
    });

    it('seeds 3 existing static setups to preserve SEO and existing routes', () => {
      assert.match(migrationSql, /'goc-lam-viec-toi-gian'/);
      assert.match(migrationSql, /'goc-podcast'/);
      assert.match(migrationSql, /'van-phong-hien-dai'/);
      assert.match(migrationSql, /'\/home\/setup-goc-lam-viec-toi-gian\.png'/);
      assert.match(migrationSql, /'\/home\/setup-goc-podcast-sang-tao\.png'/);
      assert.match(migrationSql, /'\/home\/setup-van-phong-xanh-mat\.png'/);
    });
  });

  describe('Zod Validation Schemas', () => {
    it('accepts valid product item with product_id and optional custom_image_url override', () => {
      const validProduct = {
        itemType: 'product' as const,
        productId: 'prd_rog-strix-oled-xg27aqwmg',
        variantId: 'var_tieu-chuan',
        customImageUrl: 'https://example.com/custom-override.png',
        xPct: 50,
        yPct: 45,
        widthPct: 30,
      };

      const parsed = RoomItemSchema.parse(validProduct);
      assert.equal(parsed.itemType, 'product');
      assert.equal(parsed.productId, 'prd_rog-strix-oled-xg27aqwmg');
      assert.equal(parsed.customImageUrl, 'https://example.com/custom-override.png');
    });

    it('rejects product item without product_id', () => {
      const invalidProduct = {
        itemType: 'product' as const,
        productId: '',
        xPct: 50,
        yPct: 45,
        widthPct: 30,
      };

      assert.throws(() => {
        RoomItemSchema.parse(invalidProduct);
      }, /Vật phẩm loại sản phẩm bắt buộc phải có productId hợp lệ/);
    });

    it('accepts valid decor item with custom_image_url and no product_id', () => {
      const validDecor = {
        itemType: 'decor' as const,
        customImageUrl: '/decor/plant.png',
        label: 'Cây trang trí',
        xPct: 20,
        yPct: 60,
        widthPct: 15,
      };

      const parsed = RoomItemSchema.parse(validDecor);
      assert.equal(parsed.itemType, 'decor');
      assert.equal(parsed.customImageUrl, '/decor/plant.png');
    });

    it('rejects decor item with product_id or missing custom_image_url', () => {
      const decorWithProduct = {
        itemType: 'decor' as const,
        productId: 'prd_some_product',
        customImageUrl: '/decor/lamp.png',
        xPct: 10,
        yPct: 10,
        widthPct: 10,
      };

      assert.throws(() => {
        RoomItemSchema.parse(decorWithProduct);
      }, /Vật phẩm trang trí \(decor\) không được liên kết với productId/);

      const decorWithoutImage = {
        itemType: 'decor' as const,
        customImageUrl: '',
        xPct: 10,
        yPct: 10,
        widthPct: 10,
      };

      assert.throws(() => {
        RoomItemSchema.parse(decorWithoutImage);
      }, /Vật phẩm trang trí bắt buộc phải có đường dẫn ảnh customImageUrl/);
    });

    it('enforces percentage coordinate ranges (0 to 100%)', () => {
      assert.throws(() => {
        RoomItemSchema.parse({
          itemType: 'product',
          productId: 'prd_1',
          xPct: -5,
          yPct: 50,
          widthPct: 20,
        });
      }, /Tọa độ X phải từ 0% trở lên/);

      assert.throws(() => {
        RoomItemSchema.parse({
          itemType: 'product',
          productId: 'prd_1',
          xPct: 50,
          yPct: 105,
          widthPct: 20,
        });
      }, /Tọa độ Y tối đa 100%/);

      assert.throws(() => {
        RoomItemSchema.parse({
          itemType: 'product',
          productId: 'prd_1',
          xPct: 50,
          yPct: 50,
          widthPct: 0,
        });
      }, /Chiều rộng % phải lớn hơn 0/);
    });

    it('validates RoomSetupInputSchema with slug, aspect ratio and discount constraints', () => {
      const validSetup = {
        slug: 'goc-may-dep-2026',
        title: 'Góc máy chuẩn công thái học 2026',
        bgImageUrl: '/home/setup.png',
        aspectRatio: 1.6,
        status: 'published' as const,
        comboDiscountPct: 15,
      };

      const parsed = RoomSetupInputSchema.parse(validSetup);
      assert.equal(parsed.slug, 'goc-may-dep-2026');
      assert.equal(parsed.comboDiscountPct, 15);

      // Rejects invalid slug
      assert.throws(() => {
        RoomSetupInputSchema.parse({
          ...validSetup,
          slug: 'Goc May_Sai Dinh Dang!',
        });
      }, /Slug chỉ gồm chữ thường/);

      // Rejects negative discount
      assert.throws(() => {
        RoomSetupInputSchema.parse({
          ...validSetup,
          comboDiscountPct: -10,
        });
      }, /Chiết khấu combo tối thiểu 0%/);
    });
  });

  describe('Room DAL and Offline Fallback Engine', () => {
    it('returns seeded static setups in getSampleRoomSetups', () => {
      const samples = getSampleRoomSetups();
      assert.equal(samples.length, 3);
      assert.equal(SAMPLE_ROOM_SETUPS.length, 3);
      assert.ok(SAMPLE_ROOM_ITEMS.length >= 10);
      assert.deepEqual(
        samples.map((s) => s.slug),
        ['goc-lam-viec-toi-gian', 'goc-podcast', 'van-phong-hien-dai'],
      );
    });

    it('hydrates room items with catalog products, live price and stock status', () => {
      const rawItems: RoomItem[] = [
        {
          id: 'test-item-1',
          setupId: 'test-setup',
          itemType: 'product',
          productId: 'prd_rog-strix-oled-xg27aqwmg',
          variantId: null,
          customImageUrl: null,
          label: 'Màn hình OLED',
          xPct: 50,
          yPct: 50,
          widthPct: 30,
          rotation: 0,
          flipX: false,
          zIndex: 1,
        },
        {
          id: 'test-item-2',
          setupId: 'test-setup',
          itemType: 'decor',
          productId: null,
          variantId: null,
          customImageUrl: '/decor/coffee.png',
          label: 'Cốc cà phê',
          xPct: 70,
          yPct: 70,
          widthPct: 10,
          rotation: 0,
          flipX: false,
          zIndex: 2,
        },
      ];

      const hydrated = hydrateRoomItems(rawItems, PRODUCT_RECORDS);

      // Item 1 (product)
      assert.equal(hydrated[0].itemType, 'product');
      assert.ok(hydrated[0].product, 'Product must be resolved');
      assert.equal(hydrated[0].product?.slug, 'rog-strix-oled-xg27aqwmg');
      assert.ok((hydrated[0].price ?? 0) > 0, 'Price must be populated');
      assert.equal(hydrated[0].inStock, true);
      assert.ok(hydrated[0].resolvedImageUrl?.length, 'Resolved image must be present');

      // Item 2 (decor)
      assert.equal(hydrated[1].itemType, 'decor');
      assert.equal(hydrated[1].resolvedImageUrl, '/decor/coffee.png');
      assert.equal(hydrated[1].inStock, true);
    });

    it('accurately calculates combo pricing and stock counts', () => {
      const sampleSetup = getSampleRoomSetupBySlug('goc-lam-viec-toi-gian');
      assert.ok(sampleSetup, 'Sample setup must exist');
      assert.ok(sampleSetup.items.length >= 3, 'Must contain multiple items');

      const pricing = sampleSetup.comboPricing;
      assert.ok(pricing.originalTotal > 0, 'Original total must be positive');
      assert.ok(pricing.discountAmount > 0, 'Discount amount must be positive');
      assert.equal(
        pricing.finalTotal,
        pricing.originalTotal - pricing.discountAmount,
        'Final total must match original minus discount',
      );
      assert.ok(pricing.inStockCount > 0, 'In-stock count must be positive');
      assert.equal(pricing.outOfStockCount, 0);

      // Edge case: 0% discount
      const zeroDiscount = calculateComboPricing(sampleSetup.items, 0);
      assert.equal(zeroDiscount.discountAmount, 0);
      assert.equal(zeroDiscount.finalTotal, zeroDiscount.originalTotal);
    });

    it('retrieves published room setups cleanly through DAL fallback', async () => {
      const setups = await listPublishedRoomSetups();
      assert.ok(setups.length >= 3);
      assert.ok(setups.every((s) => s.status === 'published'));
    });

    it('retrieves single room setup by slug through DAL fallback', async () => {
      const setup = await getRoomSetupBySlug('goc-podcast');
      assert.ok(setup);
      assert.equal(setup.slug, 'goc-podcast');
      assert.ok(setup.items.length > 0);
      assert.ok(setup.comboPricing.originalTotal > 0);

      const nonExistent = await getRoomSetupBySlug('khong-gian-khong-ton-tai');
      assert.equal(nonExistent, null);
    });
  });

  describe('Zero Em Dash (U+2014) Strict Compliance', () => {
    it('guarantees zero em dash characters across all room builder files', () => {
      const files = [
        { name: 'database.types.ts', content: typesContent },
        { name: '20261125000000_room_setup_builder.sql', content: migrationSql },
        { name: 'src/lib/room/types.ts', content: typesFileContent },
        { name: 'src/lib/room/schema.ts', content: schemaContent },
        { name: 'src/lib/room/sample-data.ts', content: sampleDataContent },
        { name: 'src/lib/room/dal.ts', content: dalContent },
      ];

      for (const file of files) {
        assert.equal(
          file.content.includes('\u2014'),
          false,
          `File ${file.name} must NOT contain em dash (U+2014)`,
        );
      }
    });
  });
});
