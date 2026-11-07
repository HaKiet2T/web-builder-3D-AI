import nextEnv from '@next/env';
import { request as httpsRequest } from 'node:https';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.',
  );
}

const { CATEGORY_RECORDS, PRODUCT_RECORDS } = await import('../src/lib/catalog/sample-data.ts');

const categories = CATEGORY_RECORDS.map((category) => ({
  id: category.id,
  slug: category.slug,
  name: category.name,
  description: category.description,
  position: category.position,
}));

const products = PRODUCT_RECORDS.map((product) => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  category_id: product.categoryId,
  summary: product.summary,
  description: product.description,
  highlights: product.highlights,
  brand: product.brand,
  source_url: product.sourceUrl,
  status: 'active',
  created_at: product.createdAt,
  updated_at: product.createdAt,
}));

const variants = PRODUCT_RECORDS.flatMap((product) =>
  product.variants.map((variant) => ({
    id: variant.id,
    product_id: product.id,
    slug: variant.slug,
    name: variant.name,
    sku: variant.sku,
    price: variant.price,
    compare_at_price: variant.compareAtPrice,
    stock_status: variant.stockStatus,
    stock_quantity: variant.stockQuantity,
    options: variant.options,
  })),
);

const media = PRODUCT_RECORDS.flatMap((product) =>
  product.media.map((item) => ({
    id: item.id,
    product_id: product.id,
    kind: item.kind,
    url: item.url,
    storage_path: null,
    alt: item.alt,
    width: item.width,
    height: item.height,
    position: item.position,
  })),
);

function requestJson(endpoint, { method = 'GET', body, prefer } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(body, 'utf8');
    const request = httpsRequest(
      {
        hostname: endpoint.hostname,
        port: endpoint.port || 443,
        path: `${endpoint.pathname}${endpoint.search}`,
        method,
        timeout: 15_000,
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'User-Agent': 'supabase-js/2',
          ...(payload
            ? {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': payload.length,
              }
            : {}),
          ...(prefer ? { Prefer: prefer } : {}),
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const content = Buffer.concat(chunks).toString('utf8');
          if (response.statusCode < 200 || response.statusCode >= 300) {
            let message = content;
            try {
              message = JSON.parse(content).message ?? content;
            } catch {}
            reject(new Error(`Supabase request failed (${response.statusCode}): ${message}`));
            return;
          }

          resolve(content ? JSON.parse(content) : null);
        });
      },
    );

    request.on('timeout', () => {
      request.destroy(new Error('Supabase request timed out.'));
    });
    request.on('error', reject);
    request.end(payload);
  });
}

async function seed(table, rows) {
  for (const row of rows) {
    const endpoint = new URL(`/rest/v1/${table}`, url);
    endpoint.searchParams.set('on_conflict', 'id');
    try {
      await requestJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(row),
        prefer: 'resolution=ignore-duplicates,return=minimal',
      });
    } catch (error) {
      throw new Error(
        `Failed to seed ${table} row ${row.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

await seed('categories', categories);
await seed('products', products);
await seed('product_variants', variants);
await seed('product_media', media);

for (const [table, ids] of [
  ['categories', categories.map((row) => row.id)],
  ['products', products.map((row) => row.id)],
  ['product_variants', variants.map((row) => row.id)],
  ['product_media', media.map((row) => row.id)],
]) {
  const endpoint = new URL(`/rest/v1/${table}`, url);
  endpoint.searchParams.set('select', 'id');
  endpoint.searchParams.set('id', `in.(${ids.join(',')})`);
  const found = await requestJson(endpoint);
  const foundIds = new Set(found.map((row) => row.id));
  const count = ids.filter((id) => foundIds.has(id)).length;
  console.log(`${table}: ${count}/${ids.length} sample rows present`);
  if (count !== ids.length) {
    throw new Error(`Could not verify all seeded rows in ${table}.`);
  }
}

console.log('Sample catalogue seeded. No orders or payment records were created.');
