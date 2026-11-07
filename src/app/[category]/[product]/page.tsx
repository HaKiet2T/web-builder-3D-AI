import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ProductDetailView } from '@/components/layout/ProductDetailView';
import {
  getCategory,
  getProductBySlug,
  getSampleProducts,
  listProductsByCategory,
} from '@/lib/catalog/dal';

interface ProductPageProps {
  params: Promise<{ category: string; product: string }>;
}

/**
 * Product detail route for the four catalogue categories that use the shared
 * storefront. `/monitor` keeps the ring gallery instead.
 *
 * Sample products are prerendered; products added through the admin resolve
 * from Supabase at request time.
 */

export function generateStaticParams() {
  return getSampleProducts().map((product) => ({
    category: product.categoryId,
    product: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { product: productSlug } = await params;
  const product = getSampleProducts().find((item) => item.slug === productSlug);
  if (!product) return { title: 'Sản phẩm' };

  return {
    title: product.name,
    description: product.summary,
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense fallback={<main className="home-main" aria-busy="true"><p className="cart-loading" role="status">Đang tải sản phẩm…</p></main>}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: ProductPageProps) {
  const { category: categorySlug, product: productSlug } = await params;

  const [category, product] = await Promise.all([
    getCategory(categorySlug),
    getProductBySlug(productSlug),
  ]);

  if (!category || !product || product.categoryId !== category.id) notFound();

  const related = (await listProductsByCategory(category.id)).filter((item) => item.id !== product.id);

  return <ProductDetailView category={category} product={product} related={related.slice(0, 3)} />;
}