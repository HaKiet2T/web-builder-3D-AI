import type { Product, Variant } from '@/lib/catalog/types';
import type { RoomItemType, RoomSetupStatus } from '@/lib/supabase/database.types';

export type { RoomItemType, RoomSetupStatus };

export interface RoomItem {
  id: string;
  setupId: string;
  itemType: RoomItemType;
  productId: string | null;
  variantId: string | null;
  customImageUrl: string | null;
  label: string | null;
  xPct: number;
  yPct: number;
  widthPct: number;
  rotation: number;
  flipX: boolean;
  zIndex: number;
  createdAt?: string;
  updatedAt?: string;

  // Hydrated attributes from Catalog
  product?: Product | null;
  variant?: Variant | null;
  resolvedImageUrl?: string;
  price?: number;
  compareAtPrice?: number | null;
  inStock?: boolean;
}

export interface RoomSetup {
  id: string;
  slug: string;
  title: string;
  description: string;
  bgImageUrl: string;
  aspectRatio: number;
  status: RoomSetupStatus;
  comboDiscountPct: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComboPricing {
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  inStockCount: number;
  outOfStockCount: number;
}

export interface RoomSetupWithItems extends RoomSetup {
  items: RoomItem[];
  comboPricing: ComboPricing;
}

export type DecorCategory =
  | 'all'
  | 'plant'
  | 'tech'
  | 'light'
  | 'lifestyle'
  | 'custom';

export interface DecorAsset {
  id: string;
  label: string;
  customImageUrl: string;
  storagePath?: string | null;
  category?: DecorCategory | string;
  createdAt?: string | null;
}

