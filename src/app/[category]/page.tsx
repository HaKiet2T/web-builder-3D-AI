import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CategoryView } from '@/components/layout/CategoryView';
import {
  getCategory,
  getSampleCategories,
  listCategories,
  listProductsByCategory,
} from '@/lib/catalog/dal';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

/**
 * One category route for every category in the catalogue.
 *
 * `/monitor` is the exception: it keeps its bespoke full-screen ring gallery and
 * is served by `app/monitor/page.tsx`, which sits above this dynamic segment and
 * therefore wins.
 */
export function generateStaticParams() {
  return getSampleCategories()
    .filter((category) => category.id !== 'monitor')
    .map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getSampleCategories().find((item) => item.slug === slug);
  if (!category) return { title: 'Danh mục thiết bị' };

  return {
    title: category.name,
    description: category.description,
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <Suspense fallback={<main className="home-main" aria-busy="true"><p className="cart-loading" role="status">Đang tải danh mục…</p></main>}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

async function CategoryContent({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const [products, categories] = await Promise.all([
    listProductsByCategory(category.id),
    listCategories(),
  ]);
  const otherCategories = categories.filter((item) => item.id !== category.id);

  return (
    <CategoryView
      category={category}
      products={products}
      otherCategories={otherCategories}
    />
  );
}