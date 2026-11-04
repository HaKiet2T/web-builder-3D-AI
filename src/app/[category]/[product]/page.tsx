import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
 * Every product is listed here, so both params are known at build time. That
 * also lets `usePathname()` in the header resolve during prerendering instead of
 * suspending on an unknown param.
 */

export function generateStaticParams() {
  return getSampleProducts().map((product) => ({
    category: product.categoryId,
    product: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { product: productSlug } = await params;
  const product = await getProductBySlug(productSlug);
  if (!product) return { title: 'Không tìm thấy sản phẩm' };

  return {
    title: product.name,
    description: product.summary,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { category: categorySlug, product: productSlug } = await params;

  const [category, product] = await Promise.all([
    getCategory(categorySlug),
    getProductBySlug(productSlug),
  ]);

  if (!category || !product || product.categoryId !== category.id) notFound();

  const related = (await listProductsByCategory(category.id)).filter((item) => item.id !== product.id);

  return <ProductDetailView category={category} product={product} related={related.slice(0, 3)} />;
}