import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicSupabaseClient } from '@/lib/supabase/public';
import { requireAdminSupabaseClient } from '@/lib/admin/auth';
import { CATEGORY_RECORDS, PRODUCT_RECORDS } from '@/lib/catalog/sample-data';
import type {
  Category,
  CategoryId,
  Product,
  ProductMedia,
  ProductWithVariant,
  Variant,
} from '@/lib/catalog/types';
import type {
  CategoryRow,
  ProductMediaRow,
  ProductRow,
  ProductStatus,
  ProductVariantRow,
} from '@/lib/supabase/database.types';

export interface AdminProduct extends Product {
  status: ProductStatus;
}

export interface ProductInput {
  id?: string;
  slug: string;
  name: string;
  categoryId: CategoryId;
  summary: string;
  description: string;
  highlights: string[];
  brand: string;
  sourceUrl: string | null;
  status: ProductStatus;
  variants: Array<{
    id?: string;
    slug: string;
    name: string;
    sku: string;
    price: number;
    compareAtPrice: number | null;
    stockStatus: Variant['stockStatus'];
    stockQuantity: number;
    options: Record<string, string>;
  }>;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    position: row.position,
  };
}

function mapVariant(row: ProductVariantRow): Variant {
  return {
    id: row.id,
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    stockStatus: row.stock_status,
    stockQuantity: row.stock_quantity,
    options: isStringRecord(row.options) ? row.options : {},
  };
}

function mapMedia(row: ProductMediaRow): ProductMedia {
  return {
    id: row.id,
    productId: row.product_id,
    kind: row.kind,
    url: row.url,
    alt: row.alt,
    width: row.width,
    height: row.height,
    position: row.position,
  };
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}

function mapProduct(
  row: ProductRow,
  variants: ProductVariantRow[],
  media: ProductMediaRow[],
): AdminProduct {
  const productVariants = variants
    .filter((variant) => variant.product_id === row.id)
    .map(mapVariant);
  const productMedia = media
    .filter((item) => item.product_id === row.id)
    .sort((a, b) => a.position - b.position)
    .map(mapMedia);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryId: row.category_id,
    summary: row.summary,
    description: row.description,
    highlights: row.highlights,
    brand: row.brand,
    sourceUrl: row.source_url,
    media: productMedia,
    variants: productVariants,
    priceFrom: productVariants.reduce(
      (lowest, variant) => Math.min(lowest, variant.price),
      productVariants[0]?.price ?? 0,
    ),
    purchasable: productVariants.some((variant) => variant.stockStatus !== 'out-of-stock'),
    createdAt: row.created_at,
    status: row.status,
  };
}

async function loadProducts(
  includeInactive: boolean,
  categoryId?: CategoryId,
): Promise<AdminProduct[]> {
  const supabase = includeInactive
    ? await requireAdminSupabaseClient()
    : createPublicSupabaseClient();

  if (!supabase) {
    return PRODUCT_RECORDS.map((product) => ({ ...product, status: 'active' }));
  }

  let productQuery = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (!includeInactive) productQuery = productQuery.eq('status', 'active');
  if (categoryId) productQuery = productQuery.eq('category_id', categoryId);

  const { data: productRows, error: productError } = await productQuery;

  if (productError) throw new Error(`Could not load products: ${productError.message}`);
  if (!productRows?.length) return [];

  const productIds = productRows.map((product) => product.id);
  const [
    { data: variantRows, error: variantError },
    { data: mediaRows, error: mediaError },
  ] = await Promise.all([
    supabase.from('product_variants').select('*').in('product_id', productIds),
    supabase.from('product_media').select('*').in('product_id', productIds),
  ]);

  if (variantError) throw new Error(`Could not load product variants: ${variantError.message}`);
  if (mediaError) throw new Error(`Could not load product media: ${mediaError.message}`);

  return (productRows ?? []).map((product) =>
    mapProduct(product, variantRows ?? [], mediaRows ?? []),
  );
}

export async function listCategories(): Promise<Category[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('catalog');

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [...CATEGORY_RECORDS].sort((a, b) => a.position - b.position);

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw new Error(`Could not load categories: ${error.message}`);
  return (data ?? []).map(mapCategory);
}

export function getSampleCategories(): Category[] {
  return [...CATEGORY_RECORDS].sort((a, b) => a.position - b.position);
}

export function getSampleProducts(): Product[] {
  return PRODUCT_RECORDS;
}

export async function getCategory(idOrSlug: CategoryId | string): Promise<Category | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('catalog');

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return CATEGORY_RECORDS.find(
      (category) => category.id === idOrSlug || category.slug === idOrSlug,
    ) ?? null;
  }

  const knownId = CATEGORY_RECORDS.find((category) => category.id === idOrSlug)?.id;
  if (knownId) {
    const { data: byId, error: idError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', knownId)
      .maybeSingle();

    if (idError) throw new Error(`Could not load category: ${idError.message}`);
    if (byId) return mapCategory(byId);
  }

  const { data: bySlug, error: slugError } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', idOrSlug)
    .maybeSingle();

  if (slugError) throw new Error(`Could not load category: ${slugError.message}`);
  return bySlug ? mapCategory(bySlug) : null;
}

export async function listProductsByCategory(categoryIdOrSlug: CategoryId | string): Promise<Product[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('catalog');

  const category = await getCategory(categoryIdOrSlug);
  if (!category) return [];
  return loadProducts(false, category.id);
}

export async function listProducts(): Promise<Product[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('catalog');

  return loadProducts(false);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('catalog');

  const supabase = createPublicSupabaseClient();
  if (!supabase) return PRODUCT_RECORDS.find((item) => item.slug === slug) ?? null;

  const { data: productRow, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();
  if (productError) throw new Error(`Could not load product: ${productError.message}`);
  if (!productRow) return null;

  const [{ data: variants, error: variantError }, { data: media, error: mediaError }] =
    await Promise.all([
      supabase.from('product_variants').select('*').eq('product_id', productRow.id),
      supabase.from('product_media').select('*').eq('product_id', productRow.id),
    ]);
  if (variantError) throw new Error(`Could not load product variants: ${variantError.message}`);
  if (mediaError) throw new Error(`Could not load product media: ${mediaError.message}`);

  return mapProduct(productRow, variants ?? [], media ?? []);
}

export async function getProductById(id: string): Promise<Product | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('catalog');

  const supabase = createPublicSupabaseClient();
  if (!supabase) return PRODUCT_RECORDS.find((item) => item.id === id) ?? null;

  const { data: productRow, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();
  if (productError) throw new Error(`Could not load product: ${productError.message}`);
  if (!productRow) return null;

  const [{ data: variants, error: variantError }, { data: media, error: mediaError }] =
    await Promise.all([
      supabase.from('product_variants').select('*').eq('product_id', id),
      supabase.from('product_media').select('*').eq('product_id', id),
    ]);
  if (variantError) throw new Error(`Could not load product variants: ${variantError.message}`);
  if (mediaError) throw new Error(`Could not load product media: ${mediaError.message}`);

  return mapProduct(productRow, variants ?? [], media ?? []);
}

export async function getVariant(
  variantId: string,
): Promise<{ product: Product; variant: Variant } | null> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    for (const product of PRODUCT_RECORDS) {
      const variant = product.variants.find((candidate) => candidate.id === variantId);
      if (variant) return { product, variant };
    }
    return null;
  }

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('id', variantId)
    .maybeSingle();

  if (error) throw new Error(`Could not load product variant: ${error.message}`);
  if (!data) return null;

  const product = await getProductById(data.product_id);
  return product
    ? { product, variant: product.variants.find((variant) => variant.id === data.id) ?? mapVariant(data) }
    : null;
}

export async function listPurchasableProducts(
  categoryId?: CategoryId | string,
): Promise<ProductWithVariant[]> {
  const products = categoryId ? await listProductsByCategory(categoryId) : await listProducts();

  return products.flatMap((product) => {
    const variant = pickDefaultVariant(product);
    return variant ? [{ ...product, defaultVariant: variant }] : [];
  });
}

export function pickDefaultVariant(product: Product): Variant | null {
  const sellable = product.variants.filter((variant) => variant.stockStatus !== 'out-of-stock');
  if (sellable.length === 0) return null;

  return sellable.reduce((cheapest, variant) =>
    variant.price < cheapest.price ? variant : cheapest,
  );
}

export async function listFeaturedProducts(perCategory = 2): Promise<ProductWithVariant[]> {
  const [categories, products] = await Promise.all([listCategories(), listProducts()]);

  return categories.flatMap((category) =>
    products
      .filter((product) => product.categoryId === category.id)
      .sort((a, b) =>
        a.createdAt < b.createdAt
          ? 1
          : a.createdAt > b.createdAt
            ? -1
            : a.name.localeCompare(b.name),
      )
      .slice(0, perCategory)
      .flatMap((product) => {
        const variant = pickDefaultVariant(product);
        return variant ? [{ ...product, defaultVariant: variant }] : [];
      }),
  );
}

export async function getProductBySlugWithDefaultVariant(
  slug: string,
): Promise<ProductWithVariant | null> {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  const variant = pickDefaultVariant(product) ?? product.variants[0] ?? null;
  return variant ? { ...product, defaultVariant: variant } : null;
}

export async function countProductsByCategory(): Promise<Record<string, number>> {
  return (await listProducts()).reduce<Record<string, number>>((counts, product) => {
    counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1;
    return counts;
  }, {});
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  return loadProducts(true);
}

export async function saveCatalogProduct(input: ProductInput): Promise<string> {
  const supabase = await requireAdminSupabaseClient();
  const productId = input.id ?? `prd_${crypto.randomUUID()}`;
  const productData = {
    slug: input.slug,
    name: input.name,
    category_id: input.categoryId,
    summary: input.summary,
    description: input.description,
    highlights: input.highlights,
    brand: input.brand,
    source_url: input.sourceUrl,
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  const productResult = input.id
    ? await supabase.from('products').update(productData).eq('id', productId).select('id').single()
    : await supabase
        .from('products')
        .insert({ id: productId, ...productData })
        .select('id')
        .single();

  if (productResult.error) {
    throw new Error(`Could not save product: ${productResult.error.message}`);
  }

  const variants = input.variants.map((variant) => ({
    id: variant.id || `var_${crypto.randomUUID()}`,
    product_id: productId,
    slug: variant.slug,
    name: variant.name,
    sku: variant.sku,
    price: variant.price,
    compare_at_price: variant.compareAtPrice,
    stock_status: variant.stockStatus,
    stock_quantity: variant.stockQuantity,
    options: variant.options,
  }));
  const { error: variantsError } = await supabase
    .from('product_variants')
    .upsert(variants, { onConflict: 'id' });

  if (variantsError) throw new Error(`Could not save product variants: ${variantsError.message}`);

  const keepIds = variants.map((variant) => variant.id);
  const { data: existingVariants, error: existingError } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);

  if (existingError) throw new Error(`Could not verify saved variants: ${existingError.message}`);

  const staleIds = (existingVariants ?? [])
    .map((variant) => variant.id)
    .filter((id) => !keepIds.includes(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('product_variants')
      .delete()
      .in('id', staleIds);

    if (deleteError) throw new Error(`Could not remove deleted variants: ${deleteError.message}`);
  }

  return productId;
}

export async function archiveCatalogProduct(productId: string): Promise<void> {
  const supabase = await requireAdminSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Could not archive product: ${error.message}`);
  if (!data) throw new Error('Product was not found or cannot be archived.');
}

export async function uploadCatalogMedia(input: {
  productId: string;
  fileName: string;
  contentType: string;
  content: ArrayBuffer;
  alt: string;
  width?: number | null;
  height?: number | null;
}): Promise<void> {
  const supabase = await requireAdminSupabaseClient();
  const extension = input.fileName.split('.').pop()?.toLowerCase();
  const path = `${input.productId}/${crypto.randomUUID()}.${extension}`;

  const { data: existing, error: mediaError } = await supabase
    .from('product_media')
    .select('position')
    .eq('product_id', input.productId)
    .order('position', { ascending: false })
    .limit(1);

  if (mediaError) throw new Error(`Could not load product media: ${mediaError.message}`);

  const { error: uploadError } = await supabase.storage
    .from('product-media')
    .upload(path, input.content, { contentType: input.contentType, upsert: false });

  if (uploadError) throw new Error(`Could not upload product image: ${uploadError.message}`);

  const { data: publicUrl } = supabase.storage.from('product-media').getPublicUrl(path);

  const { error: insertError } = await supabase.from('product_media').insert({
    id: `med_${crypto.randomUUID()}`,
    product_id: input.productId,
    kind: 'image',
    url: publicUrl.publicUrl,
    storage_path: path,
    alt: input.alt,
    width: input.width ?? null,
    height: input.height ?? null,
    position: (existing?.[0]?.position ?? 0) + 1,
  });

  if (insertError) {
    const { error: storageDeleteError } = await supabase.storage.from('product-media').remove([path]);
    if (storageDeleteError) {
      console.error('[catalog media cleanup]', storageDeleteError.message);
    }
    throw new Error(`Could not save product media: ${insertError.message}`);
  }
}

export async function deleteCatalogMedia(mediaId: string): Promise<void> {
  const supabase = await requireAdminSupabaseClient();
  const { data: media, error: lookupError } = await supabase
    .from('product_media')
    .select('storage_path')
    .eq('id', mediaId)
    .single();

  if (lookupError) throw new Error(`Could not load product media: ${lookupError.message}`);

  if (media.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('product-media')
      .remove([media.storage_path]);
    if (storageError) throw new Error(`Could not delete stored image: ${storageError.message}`);
  }

  const { error } = await supabase.from('product_media').delete().eq('id', mediaId);
  if (error) throw new Error(`Could not delete product media: ${error.message}`);
}
