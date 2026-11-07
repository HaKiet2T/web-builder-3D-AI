/**
 * Catalog domain types.
 *
 * These are the shapes the storefront and the admin UI talk to. They are
 * deliberately decoupled from storage: the DAL (`@/lib/catalog/dal`) returns
 * these objects whether the rows come from the seeded sample data or, later,
 * from Supabase. Pages must never import a data source directly.
 *
 * Money is stored as an integer number of VND (no floats, no minor units),
 * because every price in this catalogue is a whole đồng amount.
 */

export type CategoryId = 'monitor' | 'speaker' | 'mouse' | 'keyboard' | 'monitor-led';

export type StockStatus = 'in-stock' | 'preorder' | 'out-of-stock';

export interface Category {
  id: CategoryId;
  slug: string;
  name: string;
  description: string;
  /** Order in the home index and the header navigation. */
  position: number;
}

/**
 * A purchasable variant of a product. Every product has at least one; the
 * single-variant case just carries the default colour/finish.
 */
export interface Variant {
  id: string;
  productId: string;
  /** URL-safe, unique within the product. */
  slug: string;
  name: string;
  sku: string;
  /** Integer VND. */
  price: number;
  /** Integer VND. Present when the variant is discounted. */
  compareAtPrice: number | null;
  stockStatus: StockStatus;
  /** Units on hand. `0` with `preorder` still allows ordering. */
  stockQuantity: number;
  /** Option name/value pairs, e.g. { 'Màu': 'Đen' }. */
  options: Record<string, string>;
}

export type MediaKind = 'image' | 'model';

export interface ProductMedia {
  id: string;
  productId: string;
  kind: MediaKind;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: CategoryId;
  /** Short marketing line used on cards and detail headers. */
  summary: string;
  description: string;
  /** Bullet specs shown on the detail page. */
  highlights: string[];
  brand: string;
  /** Manufacturer spec page, shown as "thông số chính thức". */
  sourceUrl: string | null;
  media: ProductMedia[];
  variants: Variant[];
  /** Denormalised for list rendering: cheapest variant price. */
  priceFrom: number;
  /** True when at least one variant can be added to the cart. */
  purchasable: boolean;
  createdAt: string;
}

/** A product joined with the variant the shopper selected. */
export interface ProductWithVariant extends Product {
  defaultVariant: Variant;
}

export interface CartItem {
  productId: string;
  variantId: string;
  /** Snapshot fields so the cart can render before re-pricing. */
  name: string;
  variantName: string;
  imageUrl: string | null;
  /** Integer VND, refreshed from the server on every cart validation. */
  unitPrice: number;
  quantity: number;
  stockStatus: StockStatus;
}

/** Server-computed money breakdown. Never trust client totals. */
export interface CartTotals {
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
}

export interface CartValidationIssue {
  productId: string;
  variantId: string;
  code: 'unknown-variant' | 'price-changed' | 'out-of-stock' | 'quantity-capped' | 'unavailable';
  message: string;
}

export interface CartValidationResult {
  items: CartItem[];
  totals: CartTotals;
  issues: CartValidationIssue[];
}