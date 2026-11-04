import { CATEGORY_RECORDS } from '@/lib/catalog/sample-data';

/**
 * Navigation list for the header and the home index.
 *
 * Kept as a thin projection of the catalogue so there is exactly one place that
 * defines a category: `lib/catalog/sample-data.ts` today, the `categories` table
 * in Supabase later.
 */
export interface StoreCategory {
  id: string;
  href: string;
  label: string;
  description: string;
}

export const CATEGORIES: StoreCategory[] = CATEGORY_RECORDS.map((category) => ({
  id: category.id,
  href: `/${category.slug}`,
  label: category.name,
  description: category.description,
}));