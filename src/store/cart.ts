'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSyncExternalStore } from 'react';
import type { CartItem } from '@/lib/catalog/types';

/**
 * Cart state.
 *
 * Prices in the store are only a cache for rendering: every checkout and every
 * cart review re-prices the lines on the server (`app/api/cart/validate`), so a
 * tampered localStorage entry cannot change what the shopper is charged.
 */

const CART_STORAGE_KEY = 'hgk-cart-v1';

export interface CartLineInput {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  imageUrl: string | null;
  unitPrice: number;
  stockStatus: CartItem['stockStatus'];
  quantity: number;
}

interface CartState {
  items: CartItem[];
  /** Set while a line was added, so the header/announcement can react. */
  lastAddedVariantId: string | null;
  addItem: (line: CartLineInput) => void;
  removeItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  replaceItems: (items: CartItem[]) => void;
  acknowledgeAdd: () => void;
}

function clampQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(99, Math.max(1, Math.trunc(quantity)));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      lastAddedVariantId: null,

      addItem: (line) =>
        set((state) => {
          const quantity = clampQuantity(line.quantity);
          const existing = state.items.find((item) => item.variantId === line.variantId);

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.variantId === line.variantId
                  ? { ...item, quantity: clampQuantity(item.quantity + quantity) }
                  : item,
              ),
              lastAddedVariantId: line.variantId,
            };
          }

          return {
            items: [
              ...state.items,
              {
                productId: line.productId,
                variantId: line.variantId,
                name: line.name,
                variantName: line.variantName,
                imageUrl: line.imageUrl,
                unitPrice: line.unitPrice,
                quantity,
                stockStatus: line.stockStatus,
              },
            ],
            lastAddedVariantId: line.variantId,
          };
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((item) => item.variantId !== variantId),
        })),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.variantId === variantId ? { ...item, quantity: clampQuantity(quantity) } : item,
          ),
        })),

      clearCart: () => set({ items: [], lastAddedVariantId: null }),

      replaceItems: (items) => set({ items }),

      acknowledgeAdd: () => set({ lastAddedVariantId: null }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      // `lastAddedVariantId` is transient UI state, not cart content.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/** Total number of units, used for the header badge. */
export function cartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

/** Client-side estimate only; the server recomputes the authoritative total. */
export function cartSubtotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

/**
 * Whether the persisted cart has been read from storage yet.
 *
 * Persisted state is only available in the browser, so components that render
 * cart contents must render a neutral shell until this flips — otherwise the
 * server HTML ("empty") and the first client render (stored items) disagree and
 * React reports a hydration mismatch. Reading it through `useSyncExternalStore`
 * avoids the `setState`-in-effect pattern.
 */
export function useCartHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => useCartStore.persist.onFinishHydration(onStoreChange),
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}