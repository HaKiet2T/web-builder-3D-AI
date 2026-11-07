import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ProductInputSchema, VariantSchema } from '../src/lib/catalog/schema.ts';

const typesContent = readFileSync('src/lib/supabase/database.types.ts', 'utf8');
const globalCss = readFileSync('src/app/globals.css', 'utf8');
const themeProvider = readFileSync('src/components/theme/ThemeProvider.tsx', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

describe('E2E Type Safety and White-First Tactile UI Architecture', () => {
  it('enforces strict Supabase table definitions without loose index signatures', () => {
    // Must NOT have loose index signature [key: string]: unknown
    assert.doesNotMatch(
      typesContent,
      /\[key:\s*string\]:\s*unknown/,
      'database.types.ts must not contain loose [key: string]: unknown index signatures',
    );

    // Must define all core tables with strict Row, Insert, Update, Relationships
    const requiredTables = ['categories', 'products', 'product_variants', 'product_media', 'orders'];
    for (const table of requiredTables) {
      assert.match(
        typesContent,
        new RegExp(`${table}:\\s*\\{`),
        `database.types.ts must define table ${table}`,
      );
    }
  });

  it('exposes explicit Foreign Key relationships in Supabase Database types', () => {
    assert.match(typesContent, /foreignKeyName:\s*'products_category_id_fkey'/);
    assert.match(typesContent, /foreignKeyName:\s*'product_variants_product_id_fkey'/);
    assert.match(typesContent, /foreignKeyName:\s*'product_media_product_id_fkey'/);
  });

  it('provides npm scripts for automatic Supabase type synchronization and checking', () => {
    assert.ok(packageJson.scripts['types:supabase'], 'package.json must provide types:supabase');
    assert.ok(packageJson.scripts['types:check'], 'package.json must provide types:check');
  });

  it('validates product and variant inputs through centralized Zod schema', () => {
    const validVariant = {
      slug: 'den-nham',
      name: 'Màu Đen Nhám',
      sku: 'ROG-XG259CMS-BLK',
      price: 10990000,
      compareAtPrice: 12990000,
      stockStatus: 'in-stock' as const,
      stockQuantity: 15,
      options: { Màu: 'Đen' },
    };

    assert.equal(VariantSchema.safeParse(validVariant).success, true);

    const invalidVariant = {
      ...validVariant,
      price: -500, // Negative price must fail
    };
    assert.equal(VariantSchema.safeParse(invalidVariant).success, false);

    const validProduct = {
      slug: 'rog-strix-xg259cms',
      name: 'Màn hình ASUS ROG Strix XG259CMS',
      categoryId: 'monitor' as const,
      summary: 'Màn hình gaming esports 310Hz',
      description: 'Màn hình chuyên nghiệp dành cho game thủ esports.',
      highlights: ['310Hz Fast IPS', '0.3ms GTG', 'ELMB Sync'],
      brand: 'ASUS',
      sourceUrl: 'https://rog.asus.com',
      status: 'active' as const,
      variants: [validVariant],
    };

    assert.equal(ProductInputSchema.safeParse(validProduct).success, true);
  });

  it('guarantees white background as default theme with tactile hairline borders', () => {
    // ThemeProvider defaults to light theme
    assert.match(themeProvider, /readTheme\(\):\s*Theme[\s\S]*return 'light'/);
    assert.match(themeProvider, /readTheme,\s*\(\)\s*=>\s*'light'\s*as\s*Theme/);

    // Default CSS tokens must be light (white-first)
    assert.match(globalCss, /:root\s*\{[\s\S]*--page:\s*#ffffff;/);
    assert.match(globalCss, /:root\s*\{[\s\S]*--line:\s*rgba\(25,\s*25,\s*25,\s*0\.1[25]\);/);
  });
});
