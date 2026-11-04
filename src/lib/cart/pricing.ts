import type {
  CartItem,
  CartTotals,
  CartValidationIssue,
  CartValidationResult,
  Product,
  StockStatus,
  Variant,
} from '@/lib/catalog/types';

/**
 * Authoritative cart pricing.
 *
 * Deliberately pure: it receives a variant lookup function instead of importing
 * the DAL, so it can be unit-tested without a server context and can never
 * accidentally run against client-provided prices.
 *
 * The client sends only `{ variantId, quantity }`. Names, images, prices and
 * stock all come from the catalogue, so a modified localStorage payload can
 * never change the amount charged.
 */

/** Flat shipping per package, in VND. */
export const SHIPPING_FEE = 35_000;

/** Orders at or above this subtotal ship free. */
export const FREE_SHIPPING_THRESHOLD = 2_000_000;

const MAX_QUANTITY_PER_LINE = 99;

export interface CartLineRequest {
  variantId: string;
  quantity: number;
  /** Optional: a price the client believed it saw, used only to warn. */
  unitPrice?: number;
}

export type VariantLookup = (variantId: string) => { product: Product; variant: Variant } | null;

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.trunc(quantity));
}

export function validateCart(lines: CartLineRequest[], lookup: VariantLookup): CartValidationResult {
  const items: CartItem[] = [];
  const issues: CartValidationIssue[] = [];

  for (const line of lines) {
    const found = lookup(line.variantId);
    const requested = normalizeQuantity(line.quantity);

    if (!found) {
      issues.push({
        productId: '',
        variantId: line.variantId,
        code: 'unknown-variant',
        message: 'Sản phẩm không còn trong danh mục và đã được bỏ khỏi giỏ.',
      });
      continue;
    }

    const { product, variant } = found;

    if (variant.stockStatus === 'out-of-stock') {
      issues.push({
        productId: product.id,
        variantId: variant.id,
        code: 'out-of-stock',
        message: `${product.name} (${variant.name}) đã hết hàng.`,
      });
      continue;
    }

    let quantity = requested;

    if (quantity > MAX_QUANTITY_PER_LINE) {
      quantity = MAX_QUANTITY_PER_LINE;
      issues.push({
        productId: product.id,
        variantId: variant.id,
        code: 'quantity-capped',
        message: `Chỉ có thể đặt tối đa ${MAX_QUANTITY_PER_LINE} sản phẩm mỗi dòng.`,
      });
    }

    // In-stock lines are capped by the real quantity on hand; preorder lines are
    // intentionally unlimited because they ship in a later batch.
    if (variant.stockStatus === 'in-stock' && quantity > variant.stockQuantity) {
      quantity = Math.max(1, variant.stockQuantity);
      issues.push({
        productId: product.id,
        variantId: variant.id,
        code: 'quantity-capped',
        message: `${product.name} chỉ còn ${variant.stockQuantity} sản phẩm.`,
      });
    }

    // The server price always wins. If the client believed otherwise, say so.
    if (typeof line.unitPrice === 'number' && line.unitPrice !== variant.price) {
      issues.push({
        productId: product.id,
        variantId: variant.id,
        code: 'price-changed',
        message: `Giá của ${product.name} đã được cập nhật.`,
      });
    }

    const image = product.media.find((media) => media.kind === 'image') ?? null;

    items.push({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantName: variant.name,
      imageUrl: image?.url ?? null,
      unitPrice: variant.price,
      quantity,
      stockStatus: variant.stockStatus as StockStatus,
    });
  }

  return {
    items,
    totals: computeTotals(items),
    issues,
  };
}

export function computeTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  return {
    subtotal,
    shippingTotal: shippingFor(items, subtotal),
    discountTotal: 0,
    total: subtotal + shippingFor(items, subtotal),
  };
}

/**
 * Shipping for a cart.
 *
 * A mixed cart ships as two packages, and each package costs a flat fee, so the
 * cart preview and the created order must agree. They previously did not: the
 * cart quoted one fee while checkout charged two, which meant the shopper saw
 * one total and was charged a larger one.
 */
export function shippingFor(items: CartItem[], subtotal?: number): number {
  if (items.length === 0) return 0;

  const amount = subtotal ?? items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  if (amount >= FREE_SHIPPING_THRESHOLD) return 0;

  const { isSplit } = splitByAvailability(items);
  return (isSplit ? 2 : 1) * SHIPPING_FEE;
}

/** Number of packages a cart will ship as. */
export function packageCount(items: CartItem[]): number {
  return splitByAvailability(items).isSplit ? 2 : 1;
}

/** Split a cart into in-stock and preorder groups for split shipments. */
export function splitByAvailability(items: CartItem[]) {
  const inStock = items.filter((item) => item.stockStatus === 'in-stock');
  const preorder = items.filter((item) => item.stockStatus === 'preorder');
  return { inStock, preorder, isSplit: inStock.length > 0 && preorder.length > 0 };
}