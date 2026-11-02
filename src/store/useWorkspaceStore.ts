import { create } from 'zustand';

export type SpeakerColor = 'graphite' | 'sand' | 'ocean';
export type WorkspaceSetup = {
  productId: string;
  basePrice: number;
  variant: SpeakerColor;
  variantSurcharge: number;
  stockStatus: 'in-stock' | 'preorder';
};

export type ShipmentItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  stockStatus: 'in-stock' | 'preorder';
  variant?: SpeakerColor;
};

export type SplitShipment = {
  inStockGroup: ShipmentItem[];
  preorderGroup: ShipmentItem[];
};

type WorkspaceState = {
  currentSetup: WorkspaceSetup;
  cartItems: ShipmentItem[];
  isNight: boolean;
  successCelebration: number;
  isCartOpen: boolean;
  setVariant: (variant: SpeakerColor) => void;
  setNight: (isNight: boolean) => void;
  toggleNight: () => void;
  triggerPaymentSuccess: () => void;
  setCartItems: (items: ShipmentItem[]) => void;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item?: Partial<ShipmentItem>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getCartSubtotal: () => number;
  getShippingFee: () => number;
  getGrandTotal: () => number;
  getSplitShipment: () => SplitShipment;
};

const VARIANT_SURCHARGES: Record<SpeakerColor, number> = {
  graphite: 0,
  sand: 250_000,
  ocean: 450_000,
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentSetup: {
    productId: 'studio-speaker',
    basePrice: 3_490_000,
    variant: 'graphite',
    variantSurcharge: VARIANT_SURCHARGES.graphite,
    stockStatus: 'in-stock',
  },
  cartItems: [],
  isNight: false,
  successCelebration: 0,
  isCartOpen: false,

  setVariant: (variant) =>
    set((state) => ({
      currentSetup: {
        ...state.currentSetup,
        variant,
        variantSurcharge: VARIANT_SURCHARGES[variant],
      },
    })),
  setNight: (isNight) => set({ isNight }),
  toggleNight: () => set((state) => ({ isNight: !state.isNight })),
  triggerPaymentSuccess: () => set((state) => ({ successCelebration: state.successCelebration + 1 })),
  setCartItems: (cartItems) => set({ cartItems }),
  setIsCartOpen: (isCartOpen) => set({ isCartOpen }),

  addToCart: (item) => {
    const { currentSetup, cartItems } = get();
    const itemVariant = item?.variant || currentSetup.variant;
    const variantLabels: Record<SpeakerColor, string> = {
      graphite: 'Than chì',
      sand: 'Cát',
      ocean: 'Đại dương',
    };
    const unitPrice =
      item?.unitPrice ?? (currentSetup.basePrice + (VARIANT_SURCHARGES[itemVariant] ?? 0));
    const stockStatus = item?.stockStatus || currentSetup.stockStatus;
    const id = item?.id || `${currentSetup.productId}-${itemVariant}-${stockStatus}`;
    const name = item?.name || `Studio One (${variantLabels[itemVariant] || 'Tiêu chuẩn'})`;

    const existingIndex = cartItems.findIndex((i) => i.id === id);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + (item?.quantity || 1),
      };
      set({ cartItems: updated, isCartOpen: true });
    } else {
      const newItem: ShipmentItem = {
        id,
        name,
        quantity: item?.quantity || 1,
        unitPrice,
        stockStatus,
        variant: itemVariant,
      };
      set({ cartItems: [...cartItems, newItem], isCartOpen: true });
    }
  },

  removeFromCart: (id) =>
    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.id !== id),
    })),

  updateQuantity: (id, delta) =>
    set((state) => ({
      cartItems: state.cartItems
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as ShipmentItem[],
    })),

  clearCart: () => set({ cartItems: [] }),

  getTotalPrice: () => {
    const { currentSetup } = get();
    return currentSetup.basePrice + currentSetup.variantSurcharge;
  },

  getCartSubtotal: () => {
    const { cartItems } = get();
    return cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  },

  getShippingFee: () => {
    const { cartItems } = get();
    if (cartItems.length === 0) return 0;
    const hasInStock = cartItems.some((i) => i.stockStatus === 'in-stock');
    const hasPreorder = cartItems.some((i) => i.stockStatus === 'preorder');
    return hasInStock && hasPreorder ? 70_000 : 35_000;
  },

  getGrandTotal: () => {
    const subtotal = get().getCartSubtotal();
    const shipping = get().getShippingFee();
    return subtotal + shipping;
  },

  getSplitShipment: () => {
    const { cartItems } = get();
    return {
      inStockGroup: cartItems.filter((item) => item.stockStatus === 'in-stock'),
      preorderGroup: cartItems.filter((item) => item.stockStatus === 'preorder'),
    };
  },
}));
