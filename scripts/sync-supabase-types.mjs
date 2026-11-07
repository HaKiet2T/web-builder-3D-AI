import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const rootDir = process.cwd();
const migrationsDir = resolve(rootDir, 'supabase/migrations');
const typesPath = resolve(rootDir, 'src/lib/supabase/database.types.ts');

const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();
const migrationSql = migrationFiles
  .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
  .join('\n');
const typesContent = readFileSync(typesPath, 'utf8');

const EXPECTED_TABLES = [
  {
    name: 'categories',
    columns: ['id', 'slug', 'name', 'description', 'position'],
  },
  {
    name: 'products',
    columns: [
      'id',
      'slug',
      'name',
      'category_id',
      'summary',
      'description',
      'highlights',
      'brand',
      'source_url',
      'status',
      'created_at',
      'updated_at',
    ],
    relations: ['categories'],
  },
  {
    name: 'product_variants',
    columns: [
      'id',
      'product_id',
      'slug',
      'name',
      'sku',
      'price',
      'compare_at_price',
      'stock_status',
      'stock_quantity',
      'options',
    ],
    relations: ['products'],
  },
  {
    name: 'product_media',
    columns: [
      'id',
      'product_id',
      'kind',
      'url',
      'storage_path',
      'alt',
      'width',
      'height',
      'position',
    ],
    relations: ['products'],
  },
  {
    name: 'orders',
    columns: [
      'id',
      'order_number',
      'user_id',
      'customer',
      'items',
      'fulfillments',
      'subtotal',
      'shipping_total',
      'discount_total',
      'total_amount',
      'status',
      'payment_status',
      'payment_method',
      'payment_transaction_id',
      'is_split_shipment',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'user_addresses',
    columns: [
      'id',
      'user_id',
      'recipient_name',
      'phone',
      'street_address',
      'city',
      'postal_code',
      'is_default',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'user_notifications',
    columns: [
      'id',
      'user_id',
      'order_id',
      'title',
      'message',
      'type',
      'is_read',
      'created_at',
    ],
  },
];

console.log('[Supabase Type Sync] Auditing schema against database.types.ts...');

let errors = 0;

for (const table of EXPECTED_TABLES) {
  // Check migration defines table
  const tableRegex = new RegExp(`create table if not exists public\\.${table.name}`, 'i');
  if (!tableRegex.test(migrationSql)) {
    console.error(`[FAIL] Migration missing definition for table: ${table.name}`);
    errors++;
  }

  // Check types defines table
  const typeTableRegex = new RegExp(`${table.name}:\\s*\\{`, 'm');
  if (!typeTableRegex.test(typesContent)) {
    console.error(`[FAIL] database.types.ts missing definition for table: ${table.name}`);
    errors++;
  } else {
    // Check columns exist
    for (const column of table.columns) {
      const colRegex = new RegExp(`\\b${column}\\b\\??:`);
      if (!colRegex.test(typesContent)) {
        console.error(`[FAIL] Column ${table.name}.${column} not found in database.types.ts`);
        errors++;
      }
    }
  }
}

// Ensure no loose index signature [key: string]: unknown in Row types
if (/\[key:\s*string\]:\s*unknown/.test(typesContent)) {
  console.error('[FAIL] Loose index signature [key: string]: unknown detected in database.types.ts');
  errors++;
}

if (errors > 0) {
  console.error(`\n[Supabase Type Sync] Failed with ${errors} schema discrepancies.`);
  process.exit(1);
}

console.log(`[Supabase Type Sync] Successfully verified ${EXPECTED_TABLES.length} tables and strict type invariant.`);
