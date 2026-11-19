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
 * `/monitor` and `/keyboard` are the exceptions: they keep their bespoke
 * interactive showcase pages and are served by `app/monitor/page.tsx` and
 * `app/keyboard/page.tsx`, which sit above this dynamic segment and win.
 */
export function generateStaticParams() {
  return getSampleCategories()
    .filter((category) => category.id !== 'monitor' && category.id !== 'keyboard')
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