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
  elevation?: number;
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

export interface WindowConfig {
  id: string;
  wall: 'back' | 'left' | 'right';
  positionPct: number; // 10% to 90% along the wall
  width?: number; // width in meters (default ~2.0m)
  height?: number; // height in meters (default ~1.6m)
  elevationY?: number; // center elevation in meters (default ~2.0m)
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
  wallCount?: number; // 1, 2, or 3 walls
  windows?: WindowConfig[];
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

export interface Model3DAsset {
  id: string;
  label: string;
  modelUrl: string;
  storagePath?: string | null;
  fileSize?: number;
  category?: string;
  createdAt?: string | null;
}

export interface UserSavedRoom {
  id: string;
  userId: string;
  name: string;
  description?: string;
  aspectRatio: number;
  wallCount?: number;
  windows?: WindowConfig[];
  items: RoomItem[];
  createdAt: string;
  updatedAt: string;
}



