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
  setVariant: (variant: SpeakerColor) => void;
  setNight: (isNight: boolean) => void;
  toggleNight: () => void;
  triggerPaymentSuccess: () => void;
  setCartItems: (items: ShipmentItem[]) => void;
  getTotalPrice: () => number;
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

  getTotalPrice: () => {
    const { currentSetup } = get();
    return currentSetup.basePrice + currentSetup.variantSurcharge;
  },
  getSplitShipment: () => {
    const { cartItems } = get();
    return {
      inStockGroup: cartItems.filter((item) => item.stockStatus === 'in-stock'),
      preorderGroup: cartItems.filter((item) => item.stockStatus === 'preorder'),
    };
  },
}));
