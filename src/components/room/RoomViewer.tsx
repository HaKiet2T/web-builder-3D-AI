'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { RoomStage } from './RoomStage';
import { RoomStage3D } from './RoomStage3D';
import type { RoomItem, RoomSetupWithItems, UserSavedRoom, Model3DAsset, DecorAsset } from '@/lib/room/types';
import type { Product } from '@/lib/catalog/types';
import { PRESET_3D_MODELS, PRESET_DECOR_ASSETS } from '@/lib/room/sample-data';
import { PRODUCT_RECORDS } from '@/lib/catalog/sample-data';
import {
  listCustomerRoomsAction,
  saveCustomerRoomAction,
  listDynamicCatalogProductsAction,
} from '@/lib/room/user-room-actions';
import { calculateComboPricing } from '@/lib/room/pricing';
import { trackRoomEvent, type RoomAnalyticsHandler } from '@/lib/room/analytics';
import { useCartStore } from '@/store/cart';
import './room-viewer.css';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function generateUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now()}`;
}

export interface DockCatalogItem {
  id: string;
  sourceKey: string;
  title: string;
  category: 'monitor' | 'gear' | 'audio' | 'furniture' | 'decor';
  categoryLabel: string;
  price?: number;
  imageUrl: string;
  modelUrl?: string | null;
  has3DModel: boolean;
  rawType: 'product' | 'preset3d' | 'decor';
  rawItem: unknown;
  inStock?: boolean;
}

const DOCK_CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'monitor', label: 'Màn hình' },
  { id: 'audio', label: 'Loa & Âm thanh' },
  { id: 'gear', label: 'Bàn phím & Chuột' },
  { id: 'furniture', label: 'Bàn & Ghế 3D' },
  { id: 'decor', label: 'Decor & Cây cảnh' },
] as const;

export interface RoomViewerProps {
  setup: RoomSetupWithItems;
  onTrackEvent?: RoomAnalyticsHandler;
  className?: string;
  initialSavedRooms?: UserSavedRoom[];
  allProducts?: Product[];
}

export function RoomViewer({
  setup,
  onTrackEvent,
  className = '',
  initialSavedRooms,
  allProducts,
}: RoomViewerProps) {
  const [dynamicProducts, setDynamicProducts] = useState<Product[]>(() => allProducts || []);

  useEffect(() => {
    let isMounted = true;
    listDynamicCatalogProductsAction()
      .then((prods) => {
        if (isMounted && prods && prods.length > 0) {
          setDynamicProducts(prods);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const catalogProducts = useMemo(() => {
    if (dynamicProducts.length > 0) return dynamicProducts;
    if (allProducts && allProducts.length > 0) return allProducts;
    return PRODUCT_RECORDS;
  }, [dynamicProducts, allProducts]);
  // Local state for setup & items allowing customers to customize their layout in interactive mode
  const [currentSetup, setCurrentSetup] = useState<RoomSetupWithItems>(() => setup);
  const [currentItems, setCurrentItems] = useState<RoomItem[]>(() => setup.items);
  const [viewerMode, setViewerMode] = useState<'view' | 'edit'>('view');
  const [hasCustomized, setHasCustomized] = useState<boolean>(false);
  const [prevSetupItems, setPrevSetupItems] = useState<RoomItem[]>(setup.items);

  // If initial space is blank/empty, switch into interactive edit mode automatically
  useEffect(() => {
    if (setup.items.length === 0) {
      const timer = setTimeout(() => {
        setViewerMode('edit');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [setup.items.length]);

  // 3D vs 2D dimension mode (Default to 3D square room as required)
  const [viewDimension, setViewDimension] = useState<'3d' | '2d'>('3d');

  // Customer multi-room state
  const [savedRooms, setSavedRooms] = useState<UserSavedRoom[]>(() => initialSavedRooms || []);
  const [activeSavedRoomId, setActiveSavedRoomId] = useState<string | null>(null);
  const [activeRoomName, setActiveRoomName] = useState<string>(
    setup.items.length === 0 ? 'Không gian 3D mới (Trống)' : (setup.title || 'Không gian 3D')
  );

  // Modal states
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveNameInput, setSaveNameInput] = useState<string>(
    setup.items.length === 0 ? 'Góc làm việc của tôi' : (setup.title || 'Góc làm việc của tôi')
  );
  const [isSavingRoom, setIsSavingRoom] = useState<boolean>(false);
  const [saveStatusMsg, setSaveStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Item Modal state
  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
  const [addItemCategory, setAddItemCategory] = useState<'all' | 'products' | '3d' | 'decor'>('all');
  const [addItemSearch, setAddItemSearch] = useState<string>('');

  if (prevSetupItems !== setup.items) {
    setPrevSetupItems(setup.items);
    setCurrentItems(setup.items);
    setHasCustomized(false);
    if (setup.items.length === 0) {
      setViewerMode('edit');
      setActiveRoomName('Không gian 3D mới (Trống)');
    } else {
      setActiveRoomName(setup.title || 'Không gian 3D');
    }
  }

  // Extract only product items for catalog & combo interactions
  const productItems = useMemo(
    () => currentItems.filter((item) => item.itemType === 'product'),
    [currentItems],
  );

  // Set of selected item IDs in the combo cart (default: all in-stock items are selected)
  const [selectedComboIds, setSelectedComboIds] = useState<Set<string>>(
    () => new Set(productItems.filter((i) => i.inStock !== false).map((i) => i.id)),
  );

  // Sync state between Stage hover/select and the product dock
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Equipment dock search, category filter, 3D version only, and scope tabs
  const [dockSearch, setDockSearch] = useState<string>('');
  const [dockCategory, setDockCategory] = useState<string>('all');
  const [dockOnly3D, setDockOnly3D] = useState<boolean>(false);
  const [dockScopeTab, setDockScopeTab] = useState<'all' | 'in_room' | 'available'>('all');

  // Track room_view on initial mount
  useEffect(() => {
    trackRoomEvent(
      {
        type: 'room_view',
        setupSlug: setup.slug,
        setupTitle: setup.title,
        itemCount: setup.items.length,
        productCount: productItems.length,
      },
      onTrackEvent
    );
  }, [setup.slug, setup.title, setup.items.length, productItems.length, onTrackEvent]);

  // Cart feedback state
  const [isAddedSuccess, setIsAddedSuccess] = useState<boolean>(false);
  const [addedCount, setAddedCount] = useState<number>(0);

  // Cart store actions
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Filter items that are currently selected for the combo
  const selectedProductItems = useMemo(
    () => productItems.filter((item) => selectedComboIds.has(item.id) && item.inStock !== false),
    [productItems, selectedComboIds],
  );

  // Dynamic live combo pricing: applies discount if 2 or more products are selected
  const comboPricing = useMemo(() => {
    const discountToApply =
      selectedProductItems.length >= 2 ? setup.comboDiscountPct : 0;
    return calculateComboPricing(selectedProductItems, discountToApply);
  }, [selectedProductItems, setup.comboDiscountPct]);

  // Toggle item in combo list with analytics
  const handleToggleComboItem = useCallback((itemId: string) => {
    setSelectedComboIds((prev) => {
      const next = new Set(prev);
      const willSelect = !next.has(itemId);
      if (willSelect) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }

      trackRoomEvent(
        {
          type: 'room_combo_toggle',
          setupSlug: setup.slug,
          itemId,
          selected: willSelect,
          selectedCount: next.size,
        },
        onTrackEvent
      );

      return next;
    });
  }, [setup.slug, onTrackEvent]);

  // Select all in-stock products
  const handleSelectAll = useCallback(() => {
    setSelectedComboIds(new Set(productItems.filter((i) => i.inStock !== false).map((i) => i.id)));
  }, [productItems]);

  // Deselect all products
  const handleDeselectAll = useCallback(() => {
    setSelectedComboIds(new Set());
  }, []);

  // Handle item hover with analytics tracking
  const handleItemHover = useCallback((item: RoomItem | null) => {
    setHoveredItemId(item?.id ?? null);
    if (item && item.itemType === 'product') {
      trackRoomEvent(
        {
          type: 'room_item_hover',
          setupSlug: setup.slug,
          itemId: item.id,
          itemType: item.itemType,
          productId: item.productId,
          productName: item.product?.name || item.label,
        },
        onTrackEvent
      );
    }
  }, [setup.slug, onTrackEvent]);

  // Handle item click with analytics tracking
  const handleItemClick = useCallback((item: RoomItem) => {
    setSelectedItemId((prev) => (prev === item.id ? null : item.id));
    if (item.itemType === 'product') {
      trackRoomEvent(
        {
          type: 'room_item_click',
          setupSlug: setup.slug,
          itemId: item.id,
          itemType: item.itemType,
          productId: item.productId,
          productName: item.product?.name || item.label,
          price: item.price,
        },
        onTrackEvent
      );
    }
  }, [setup.slug, onTrackEvent]);

  // Add all selected products to cart and open cart drawer
  const handleAddComboToCart = useCallback(() => {
    if (selectedProductItems.length === 0) return;

    for (const item of selectedProductItems) {
      const variantId =
        item.variantId ||
        item.product?.variants?.[0]?.id ||
        item.productId ||
        item.id;
      const variantName =
        item.variant?.name ||
        item.product?.variants?.[0]?.name ||
        'Tiêu chuẩn';
      const unitPrice = item.price ?? 0;

      addItem({
        productId: item.productId || item.id,
        variantId,
        name: item.product?.name || item.label || 'Sản phẩm setup',
        variantName,
        imageUrl:
          item.resolvedImageUrl ||
          item.customImageUrl ||
          item.product?.media?.[0]?.url ||
          null,
        unitPrice,
        stockStatus:
          item.variant?.stockStatus || (item.inStock ? 'in-stock' : 'out-of-stock'),
        quantity: 1,
      });
    }

    // Dispatch room_combo_add_cart analytics event
    trackRoomEvent(
      {
        type: 'room_combo_add_cart',
        setupSlug: setup.slug,
        productCount: selectedProductItems.length,
        originalTotal: comboPricing.originalTotal,
        discountAmount: comboPricing.discountAmount,
        finalTotal: comboPricing.finalTotal,
      },
      onTrackEvent
    );

    setAddedCount(selectedProductItems.length);
    setIsAddedSuccess(true);
    openCart();

    setTimeout(() => {
      setIsAddedSuccess(false);
    }, 3500);
  }, [selectedProductItems, addItem, openCart, setup.slug, comboPricing, onTrackEvent]);

  // Customer interactive customization handlers
  const handleUpdateItem = useCallback((updatedItem: RoomItem) => {
    setCurrentItems((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)),
    );
    setHasCustomized(true);
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setCurrentItems((prev) => prev.filter((i) => i.id !== id));
    setHasCustomized(true);
  }, []);

  const handleResetLayout = useCallback(() => {
    setCurrentItems(setup.items);
    setHasCustomized(false);
  }, [setup.items]);

  // Load customer saved rooms from server and localStorage on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSavedRooms() {
      try {
        const serverRooms = await listCustomerRoomsAction();
        if (isMounted && serverRooms.length > 0) {
          setSavedRooms((prev) => {
            const map = new Map<string, UserSavedRoom>();
            for (const r of [...serverRooms, ...prev]) {
              map.set(r.id, r);
            }
            return Array.from(map.values());
          });
        }
      } catch {
        // Continue with local storage for guests
      }

      try {
        const rawLocal = localStorage.getItem('local_user_saved_rooms');
        if (rawLocal) {
          const localRooms: UserSavedRoom[] = JSON.parse(rawLocal);
          if (Array.isArray(localRooms) && localRooms.length > 0 && isMounted) {
            setSavedRooms((prev) => {
              const map = new Map<string, UserSavedRoom>();
              for (const r of [...localRooms, ...prev]) {
                map.set(r.id, r);
              }
              return Array.from(map.values());
            });
          }
        }
      } catch {
        // Ignore local storage error
      }
    }

    loadSavedRooms();
    return () => {
      isMounted = false;
    };
  }, []);

  // Create empty blank square room (white walls, wooden floor, zero items)
  const handleCreateBlankRoom = useCallback(() => {
    setCurrentItems([]);
    setActiveSavedRoomId(null);
    setActiveRoomName('Không gian 3D mới (Trống)');
    setHasCustomized(true);
    setViewerMode('edit');
    setViewDimension('3d');
    setCurrentSetup((prev) => ({ ...prev, wallCount: 2, windows: [] }));
    setSaveStatusMsg({
      type: 'success',
      text: 'Đã tạo không gian phòng vuông trống mới! Bạn có thể thêm các vật thể vào phòng.',
    });
    setTimeout(() => setSaveStatusMsg(null), 3500);
  }, []);

  // Save room handler
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = saveNameInput.trim();
    if (!cleanName) return;

    setIsSavingRoom(true);
    setSaveStatusMsg(null);

    try {
      const res = await saveCustomerRoomAction({
        id: activeSavedRoomId || undefined,
        name: cleanName,
        aspectRatio: currentSetup.aspectRatio || 1.6,
        wallCount: currentSetup.wallCount || 2,
        windows: currentSetup.windows || [],
        items: currentItems,
      });

      if (res.success && res.room) {
        setSavedRooms((prev) => [res.room!, ...prev.filter((r) => r.id !== res.room!.id)]);
        setActiveSavedRoomId(res.room.id);
        setActiveRoomName(res.room.name);
        setShowSaveModal(false);
        setSaveStatusMsg({
          type: 'success',
          text: `Đã lưu không gian "${res.room.name}" vào tài khoản của bạn!`,
        });
        setTimeout(() => setSaveStatusMsg(null), 4000);
      } else {
        // Guest fallback: save to localStorage
        const guestRoom: UserSavedRoom = {
          id: activeSavedRoomId || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: 'guest',
          name: cleanName,
          aspectRatio: currentSetup.aspectRatio || 1.6,
          wallCount: currentSetup.wallCount || 2,
          windows: currentSetup.windows || [],
          items: currentItems,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const existingRaw = localStorage.getItem('local_user_saved_rooms');
        const existingList: UserSavedRoom[] = existingRaw ? JSON.parse(existingRaw) : [];
        const nextList = [guestRoom, ...existingList.filter((r) => r.id !== guestRoom.id)];
        localStorage.setItem('local_user_saved_rooms', JSON.stringify(nextList));

        setSavedRooms(nextList);
        setActiveSavedRoomId(guestRoom.id);
        setActiveRoomName(guestRoom.name);
        setShowSaveModal(false);
        setSaveStatusMsg({
          type: 'success',
          text: `Đã lưu không gian "${guestRoom.name}" vào bộ nhớ trình duyệt! Đăng nhập để đồng bộ vào tài khoản.`,
        });
        setTimeout(() => setSaveStatusMsg(null), 4500);
      }
    } catch {
      // Local fallback
      const guestRoom: UserSavedRoom = {
        id: activeSavedRoomId || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: 'guest',
        name: cleanName,
        aspectRatio: currentSetup.aspectRatio || 1.6,
        wallCount: currentSetup.wallCount || 2,
        windows: currentSetup.windows || [],
        items: currentItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSavedRooms((prev) => [guestRoom, ...prev.filter((r) => r.id !== guestRoom.id)]);
      setActiveSavedRoomId(guestRoom.id);
      setActiveRoomName(guestRoom.name);
      setShowSaveModal(false);
      setSaveStatusMsg({
        type: 'success',
        text: `Đã lưu không gian "${guestRoom.name}"!`,
      });
      setTimeout(() => setSaveStatusMsg(null), 4000);
    } finally {
      setIsSavingRoom(false);
    }
  };

  // Switch to a saved room
  const handleSelectRoom = (roomId: string) => {
    if (!roomId) {
      setCurrentItems(setup.items);
      setActiveSavedRoomId(null);
      setActiveRoomName(setup.title);
      setHasCustomized(false);
      setCurrentSetup(setup);
      return;
    }

    const room = savedRooms.find((r) => r.id === roomId);
    if (room) {
      setCurrentItems(room.items);
      setActiveSavedRoomId(room.id);
      setActiveRoomName(room.name);
      setHasCustomized(false);
      setSelectedItemId(null);
      if (room.wallCount !== undefined || room.windows !== undefined) {
        setCurrentSetup((prev) => ({
          ...prev,
          wallCount: room.wallCount ?? prev.wallCount,
          windows: room.windows ?? prev.windows,
        }));
      }
    }
  };

  // Add an object into the 3D room
  const handleAddObjectToRoom = useCallback(
    (itemType: 'product' | 'decor', rawItem: Product | Model3DAsset | DecorAsset) => {
      const nextZ = currentItems.reduce((max, it) => Math.max(max, it.zIndex), 0) + 1;
      let newItem: RoomItem;

      if (itemType === 'product') {
        const prod = rawItem as Product;
        const variants = prod.variants || [];
        const defaultVariant = variants[0];
        const media = prod.media || [];
        const modelMedia = media.find((m) => m.kind === 'model');
        const defaultModelUrl =
          modelMedia?.url ||
          (prod.categoryId === 'monitor'
            ? '/models3d/ultrawide-monitor.glb'
            : prod.categoryId === 'speaker'
            ? '/models3d/studio-speakers.glb'
            : prod.categoryId === 'keyboard'
            ? '/models3d/test-custom-keyboard-mwympp9y.glb'
            : null);
        const resolvedUrl =
          media.find((m) => m.kind === 'image')?.url ||
          media[0]?.url ||
          '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png';
        newItem = {
          id: generateUniqueId('item'),
          setupId: setup.id,
          itemType: 'product',
          productId: prod.id,
          variantId: defaultVariant?.id || null,
          customImageUrl: defaultModelUrl,
          label: prod.name,
          xPct: 50.0,
          yPct: 50.0,
          widthPct: 20.0,
          rotation: 0,
          flipX: false,
          zIndex: nextZ,
          product: prod,
          variant: defaultVariant,
          resolvedImageUrl: resolvedUrl,
          price: prod.priceFrom,
          inStock: true,
        };
      } else {
        const decor = rawItem as Model3DAsset & DecorAsset;
        const resolvedUrl = decor.modelUrl || decor.customImageUrl;
        newItem = {
          id: generateUniqueId('decor'),
          setupId: setup.id,
          itemType: 'decor',
          productId: null,
          variantId: null,
          customImageUrl: decor.modelUrl || decor.customImageUrl || null,
          label: decor.label || 'Vật phẩm 3D',
          xPct: 50.0,
          yPct: 50.0,
          widthPct: 20.0,
          rotation: 0,
          flipX: false,
          zIndex: nextZ,
          ...(resolvedUrl ? { resolvedImageUrl: resolvedUrl } : {}),
          inStock: true,
        };
      }

      setCurrentItems((prev) => [...prev, newItem]);
      setSelectedItemId(newItem.id);
      setHasCustomized(true);
      setShowAddItemModal(false);
      setViewDimension('3d');
    },
    [currentItems, setup.id]
  );

  // Base catalogue of available equipment and 3D assets
  const baseDockCatalog = useMemo<DockCatalogItem[]>(() => {
    const items: DockCatalogItem[] = [];

    // 1. 3D Model Presets
    items.push(
      {
        id: 'preset-3d-desk',
        sourceKey: 'preset-3d-desk',
        title: 'Bàn nâng hạ thông minh 3D',
        category: 'furniture',
        categoryLabel: 'Bàn & Ghế 3D',
        price: 6500000,
        imageUrl: '/decor/desk-mat.png',
        modelUrl: '/models3d/smart-desk.glb',
        has3DModel: true,
        rawType: 'preset3d',
        rawItem: {
          id: 'preset-3d-desk',
          name: 'Bàn nâng hạ thông minh 3D',
          priceFrom: 6500000,
          modelUrl: '/models3d/smart-desk.glb',
        },
        inStock: true,
      },
      {
        id: 'preset-3d-chair',
        sourceKey: 'preset-3d-chair',
        title: 'Ghế công thái học Ergonomic 3D',
        category: 'furniture',
        categoryLabel: 'Bàn & Ghế 3D',
        price: 4890000,
        imageUrl: '/decor/desk-lamp.png',
        modelUrl: '/models3d/ergonomic-chair.glb',
        has3DModel: true,
        rawType: 'preset3d',
        rawItem: {
          id: 'preset-3d-chair',
          name: 'Ghế công thái học Ergonomic 3D',
          priceFrom: 4890000,
          modelUrl: '/models3d/ergonomic-chair.glb',
        },
        inStock: true,
      },
      {
        id: 'preset-3d-monitor',
        sourceKey: 'preset-3d-monitor',
        title: 'Màn hình UltraWide 34 inch 3D',
        category: 'monitor',
        categoryLabel: 'Màn hình',
        price: 14990000,
        imageUrl: '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png',
        modelUrl: '/models3d/ultrawide-monitor.glb',
        has3DModel: true,
        rawType: 'preset3d',
        rawItem: {
          id: 'preset-3d-monitor',
          name: 'Màn hình UltraWide 34 inch 3D',
          priceFrom: 14990000,
          modelUrl: '/models3d/ultrawide-monitor.glb',
        },
        inStock: true,
      },
      {
        id: 'preset-3d-gaming-pc',
        sourceKey: 'preset-3d-gaming-pc',
        title: 'PC Gaming Cyberpunk RGB 3D',
        category: 'gear',
        categoryLabel: 'PC & Linh kiện',
        price: 32500000,
        imageUrl: '/products/asus/ROG%20Strix%20XG259QNS.png',
        modelUrl: '/models3d/gaming-pc.glb',
        has3DModel: true,
        rawType: 'preset3d',
        rawItem: {
          id: 'preset-3d-gaming-pc',
          name: 'PC Gaming Cyberpunk RGB 3D',
          priceFrom: 32500000,
          modelUrl: '/models3d/gaming-pc.glb',
        },
        inStock: true,
      },
      {
        id: 'preset-3d-speakers',
        sourceKey: 'preset-3d-speakers',
        title: 'Cặp loa kiểm âm Studio 3D',
        category: 'audio',
        categoryLabel: 'Loa & Âm thanh',
        price: 3200000,
        imageUrl: '/products/asus/ROG%20Swift%20OLED%20PG32UCDM.png',
        modelUrl: '/models3d/studio-speakers.glb',
        has3DModel: true,
        rawType: 'preset3d',
        rawItem: {
          id: 'preset-3d-speakers',
          name: 'Cặp loa kiểm âm Studio 3D',
          priceFrom: 3200000,
          modelUrl: '/models3d/studio-speakers.glb',
        },
        inStock: true,
      },
      {
        id: 'preset-3d-plant',
        sourceKey: 'preset-3d-plant',
        title: 'Chậu cây cảnh để bàn 3D',
        category: 'decor',
        categoryLabel: 'Decor & Cây cảnh',
        price: 250000,
        imageUrl: '/decor/plant-fiddle-leaf.png',
        modelUrl: '/models3d/desk-plant.glb',
        has3DModel: true,
        rawType: 'decor',
        rawItem: {
          id: 'preset-3d-plant',
          label: 'Chậu cây cảnh để bàn 3D',
          price: 250000,
          modelUrl: '/models3d/desk-plant.glb',
        },
        inStock: true,
      }
    );

    // 2. Store Products from catalogProducts
    catalogProducts.forEach((p) => {
      let category: 'monitor' | 'gear' | 'audio' | 'furniture' | 'decor' = 'gear';
      let categoryLabel = 'Bàn phím & Chuột';
      let modelUrl: string | null = null;
      let has3D = false;

      // Ưu tiên model 3D thực tế đã được upload trong media
      const modelMedia = p.media?.find((m) => m.kind === 'model');
      if (modelMedia?.url) {
        modelUrl = modelMedia.url;
        has3D = true;
      } else if (p.categoryId === 'monitor') {
        category = 'monitor';
        categoryLabel = 'Màn hình';
        modelUrl = '/models3d/ultrawide-monitor.glb';
        has3D = true;
      } else if (p.categoryId === 'speaker') {
        category = 'audio';
        categoryLabel = 'Loa & Âm thanh';
        modelUrl = '/models3d/studio-speakers.glb';
        has3D = true;
      } else if (p.categoryId === 'keyboard') {
        category = 'gear';
        categoryLabel = 'Bàn phím cơ';
        modelUrl = '/models3d/test-custom-keyboard-mwympp9y.glb';
        has3D = true;
      } else if (p.categoryId === 'mouse') {
        category = 'gear';
        categoryLabel = 'Chuột gaming';
        modelUrl = null;
        has3D = false;
      } else if (p.categoryId === 'monitor-led') {
        category = 'decor';
        categoryLabel = 'Đèn màn hình';
        modelUrl = null;
        has3D = false;
      }

      if (p.categoryId === 'monitor') {
        category = 'monitor';
        categoryLabel = 'Màn hình';
      } else if (p.categoryId === 'speaker') {
        category = 'audio';
        categoryLabel = 'Loa & Âm thanh';
      } else if (p.categoryId === 'keyboard' || p.categoryId === 'mouse') {
        category = 'gear';
        categoryLabel = p.categoryId === 'keyboard' ? 'Bàn phím cơ' : 'Chuột gaming';
      } else if (p.categoryId === 'monitor-led') {
        category = 'decor';
        categoryLabel = 'Đèn màn hình';
      }

      const imageUrl =
        p.media?.find((m) => m.kind === 'image')?.url ||
        p.media?.[0]?.url ||
        '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png';

      items.push({
        id: p.id,
        sourceKey: p.id,
        title: p.name,
        category,
        categoryLabel,
        price: p.priceFrom,
        imageUrl,
        modelUrl,
        has3DModel: has3D,
        rawType: 'product',
        rawItem: p,
        inStock: true,
      });
    });

    // 3. Decor items
    PRESET_DECOR_ASSETS.forEach((d) => {
      let cat: 'monitor' | 'gear' | 'audio' | 'furniture' | 'decor' = 'decor';
      let catLabel = 'Decor trang trí';
      if (d.id.includes('headphone') || d.id.includes('desk-mat')) {
        cat = 'gear';
        catLabel = 'Phụ kiện góc setup';
      }
      items.push({
        id: d.id,
        sourceKey: d.id,
        title: d.label,
        category: cat,
        categoryLabel: catLabel,
        price: d.id.includes('lamp') ? 680000 : d.id.includes('clock') ? 420000 : 250000,
        imageUrl: d.customImageUrl,
        modelUrl: null,
        has3DModel: false,
        rawType: 'decor',
        rawItem: d,
        inStock: true,
      });
    });

    return items;
  }, [catalogProducts]);

  // Merge catalogue with live room items to compute in-room status
  const dockDisplayItems = useMemo(() => {
    const list = baseDockCatalog.map((catItem) => {
      const matchingRoomItem = currentItems.find((it) => {
        if (it.productId && (it.productId === catItem.id || it.productId === `prd_${catItem.id}`)) {
          return true;
        }
        if (it.id === catItem.id) return true;
        if (it.label === catItem.title) return true;
        if (catItem.modelUrl && it.customImageUrl === catItem.modelUrl) return true;
        return false;
      });

      return {
        ...catItem,
        isInRoom: Boolean(matchingRoomItem),
        roomItemId: matchingRoomItem ? matchingRoomItem.id : null,
      };
    });

    // Also include any custom room items not present in static presets
    currentItems.forEach((roomItem) => {
      const alreadyIncluded = list.some(
        (entry) => entry.isInRoom && entry.roomItemId === roomItem.id
      );
      if (!alreadyIncluded) {
        const isProduct = roomItem.itemType === 'product';
        const has3D = Boolean(
          roomItem.customImageUrl &&
            (roomItem.customImageUrl.endsWith('.glb') ||
              roomItem.customImageUrl.includes('/models3d/'))
        );
        list.unshift({
          id: roomItem.id,
          sourceKey: roomItem.id,
          title: roomItem.product?.name || roomItem.label || 'Vật phẩm',
          category: (roomItem.product?.categoryId as DockCatalogItem['category']) || 'gear',
          categoryLabel: isProduct ? 'Sản phẩm setup' : 'Vật thể 3D',
          price: roomItem.price || roomItem.product?.priceFrom || 0,
          imageUrl:
            roomItem.resolvedImageUrl ||
            roomItem.customImageUrl ||
            roomItem.product?.media?.[0]?.url ||
            '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png',
          modelUrl: roomItem.customImageUrl || null,
          has3DModel: has3D,
          rawType: isProduct ? 'product' : 'decor',
          rawItem: roomItem.product || roomItem,
          inStock: roomItem.inStock !== false,
          isInRoom: true,
          roomItemId: roomItem.id,
        });
      }
    });

    return list;
  }, [baseDockCatalog, currentItems]);

  // Filter dock catalogue items based on user criteria
  const filteredDockItems = useMemo(() => {
    return dockDisplayItems.filter((item) => {
      // 1. Text search
      if (dockSearch.trim() !== '') {
        const query = dockSearch.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchCat = item.categoryLabel.toLowerCase().includes(query);
        if (!matchTitle && !matchCat) return false;
      }

      // 2. Category pill
      if (dockCategory !== 'all') {
        if (item.category !== dockCategory) return false;
      }

      // 3. 3D Model Only toggle
      if (dockOnly3D && !item.has3DModel) {
        return false;
      }

      // 4. Scope tabs (all / in_room / available)
      if (dockScopeTab === 'in_room' && !item.isInRoom) {
        return false;
      }
      if (dockScopeTab === 'available' && item.isInRoom) {
        return false;
      }

      return true;
    });
  }, [dockDisplayItems, dockSearch, dockCategory, dockOnly3D, dockScopeTab]);

  const inRoomItemsCount = useMemo(
    () => dockDisplayItems.filter((i) => i.isInRoom).length,
    [dockDisplayItems]
  );
  const availableItemsCount = useMemo(
    () => dockDisplayItems.filter((i) => !i.isInRoom).length,
    [dockDisplayItems]
  );
  const models3DCount = useMemo(
    () => dockDisplayItems.filter((i) => i.has3DModel).length,
    [dockDisplayItems]
  );

  // Add an item from the dock catalogue directly to the 3D room canvas
  const handleAddCatalogItemToRoom = useCallback(
    (catItem: DockCatalogItem) => {
      const nextZ = currentItems.reduce((max, it) => Math.max(max, it.zIndex), 0) + 1;
      const count = currentItems.length;
      const xPct = 40.0 + (count % 5) * 5.0;
      const yPct = 40.0 + (count % 5) * 5.0;

      let newItem: RoomItem;

      if (catItem.rawType === 'product') {
        const rawProd = catItem.rawItem as Product;
        const defaultVariant = rawProd.variants?.[0];
        const modelMedia = rawProd.media?.find((m) => m.kind === 'model');
        const effectiveModelUrl = catItem.modelUrl || modelMedia?.url || null;
        newItem = {
          id: generateUniqueId('item'),
          setupId: setup.id,
          itemType: 'product',
          productId: rawProd.id,
          variantId: defaultVariant?.id || null,
          customImageUrl: effectiveModelUrl,
          label: catItem.title,
          xPct,
          yPct,
          widthPct: 22.0,
          rotation: 0,
          flipX: false,
          zIndex: nextZ,
          product: rawProd,
          variant: defaultVariant,
          resolvedImageUrl: catItem.imageUrl,
          price: catItem.price || 0,
          inStock: true,
        };
      } else {
        newItem = {
          id: generateUniqueId(catItem.rawType === 'preset3d' ? 'model3d' : 'decor'),
          setupId: setup.id,
          itemType: catItem.rawType === 'preset3d' ? 'product' : 'decor',
          productId: catItem.rawType === 'preset3d' ? `prd_${catItem.id}` : null,
          variantId: null,
          customImageUrl: catItem.modelUrl || catItem.imageUrl,
          label: catItem.title,
          xPct,
          yPct,
          widthPct: 22.0,
          rotation: 0,
          flipX: false,
          zIndex: nextZ,
          resolvedImageUrl: catItem.imageUrl,
          price: catItem.price || 0,
          inStock: true,
        };
      }

      setCurrentItems((prev) => [...prev, newItem]);
      setSelectedItemId(newItem.id);
      setHoveredItemId(newItem.id);
      setHasCustomized(true);
      setViewDimension('3d');
      setViewerMode('edit');
      setSaveStatusMsg({
        type: 'success',
        text: `Đã thêm "${catItem.title}" vào không gian 3D! Bạn có thể kéo thả để đổi vị trí.`,
      });
      setTimeout(() => setSaveStatusMsg(null), 3500);
    },
    [currentItems, setup.id]
  );

  // Remove an item from the 3D room canvas via the dock card
  const handleRemoveCatalogItem = useCallback(
    (roomId: string, title: string) => {
      handleDeleteItem(roomId);
      if (selectedItemId === roomId) {
        setSelectedItemId(null);
      }
      if (hoveredItemId === roomId) {
        setHoveredItemId(null);
      }
      setSaveStatusMsg({
        type: 'success',
        text: `Đã gỡ "${title}" khỏi không gian 3D.`,
      });
      setTimeout(() => setSaveStatusMsg(null), 2500);
    },
    [handleDeleteItem, selectedItemId, hoveredItemId]
  );

  return (
    <div className={`room-viewer-container ${className}`}>
      {/* 1. Core Tactile Setup Stage */}
      <div className="room-viewer-stage-wrapper">
        {/* Customer Interactive Mode Switcher Bar */}
        <div className="room-viewer-mode-bar">
          <div className="room-mode-pill-group" role="tablist" aria-label="Chế độ trải nghiệm góc setup">
            <button
              type="button"
              role="tab"
              aria-selected={viewerMode === 'view'}
              className={`room-mode-pill ${viewerMode === 'view' ? 'room-mode-pill--active' : ''}`}
              onClick={() => setViewerMode('view')}
            >
              <span aria-hidden="true">👁</span>
              <span>Khám phá &amp; Mua sắm</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewerMode === 'edit'}
              className={`room-mode-pill ${viewerMode === 'edit' ? 'room-mode-pill--active' : ''}`}
              onClick={() => setViewerMode('edit')}
            >
              <span aria-hidden="true">✋</span>
              <span>Tự tay sắp xếp góc máy</span>
              <span className="room-mode-pill-badge">Kéo thả</span>
            </button>
          </div>

          {/* 3D vs 2D Dimension Switcher */}
          <div className="room-mode-pill-group" role="tablist" aria-label="Không gian 3D hay 2D">
            <button
              type="button"
              role="tab"
              aria-selected={viewDimension === '3d'}
              className={`room-mode-pill ${viewDimension === '3d' ? 'room-mode-pill--active' : ''}`}
              onClick={() => setViewDimension('3d')}
            >
              <span>🧊 3D Không gian</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewDimension === '2d'}
              className={`room-mode-pill ${viewDimension === '2d' ? 'room-mode-pill--active' : ''}`}
              onClick={() => setViewDimension('2d')}
            >
              <span>🖼 2D Mặt phẳng</span>
            </button>
          </div>

          {/* Customer 3D Studio Action Controls */}
          <div className="room-3d-toolbar-group">
            <button
              type="button"
              className="room-action-btn room-action-btn--primary"
              onClick={() => setShowAddItemModal(true)}
              title="Thêm sản phẩm hoặc vật thể vào phòng 3D"
            >
              <span>+ Thêm vật phẩm vào 3D</span>
            </button>
            <button
              type="button"
              className="room-action-btn"
              onClick={handleCreateBlankRoom}
              title="Xóa hết để bắt đầu từ căn phòng vuông trắng trống"
            >
              <span>+ Phòng trống mới</span>
            </button>
            <button
              type="button"
              className="room-action-btn room-action-btn--success"
              onClick={() => {
                setSaveNameInput(activeRoomName || 'Góc làm việc của tôi');
                setShowSaveModal(true);
              }}
              title="Lưu lại góc máy 3D này vào tài khoản của bạn"
            >
              <span>💾 Lưu vào tài khoản</span>
            </button>

            {savedRooms.length > 0 && (
              <select
                value={activeSavedRoomId || ''}
                onChange={(e) => handleSelectRoom(e.target.value)}
                className="room-action-btn"
                style={{ cursor: 'pointer', background: '#f8fafc' }}
                aria-label="Chọn không gian đã lưu"
              >
                <option value="">{activeRoomName} (Hiện tại)</option>
                {savedRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.items.length} vật phẩm)
                  </option>
                ))}
              </select>
            )}

            {hasCustomized && (
              <button
                type="button"
                className="room-reset-layout-btn"
                onClick={handleResetLayout}
                title="Khôi phục lại vị trí gốc của các thiết bị"
              >
                ↺ Khôi phục vị trí mặc định
              </button>
            )}
          </div>
        </div>

        {/* Status notification toast */}
        {saveStatusMsg && (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              background: saveStatusMsg.type === 'success' ? '#ecfdf5' : '#fff1f2',
              color: saveStatusMsg.type === 'success' ? '#047857' : '#be123c',
              border: `1px solid ${saveStatusMsg.type === 'success' ? '#a7f3d0' : '#fecdd3'}`,
            }}
          >
            {saveStatusMsg.text}
          </div>
        )}

        {/* 3D Room Stage vs 2D Stage */}
        {viewDimension === '3d' ? (
          <RoomStage3D
            setup={currentSetup}
            items={currentItems}
            mode={viewerMode}
            selectedItemId={selectedItemId}
            onSelectItem={(id) => setSelectedItemId(id)}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onUpdateSetup={(updated) => setCurrentSetup((prev) => ({ ...prev, ...updated }))}
          />
        ) : (
          <RoomStage
            setup={currentSetup}
            items={currentItems}
            mode={viewerMode}
            hoveredItemId={hoveredItemId}
            selectedItemId={selectedItemId}
            showHotspots={true}
            onItemHover={handleItemHover}
            onItemClick={handleItemClick}
            onSelectItem={(id) => setSelectedItemId(id)}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onTrackEvent={onTrackEvent}
          />
        )}

        {/* Modal: Save Customer Room to Account */}
        {showSaveModal && (
          <div className="room-modal-backdrop" onClick={() => setShowSaveModal(false)}>
            <div className="room-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="room-modal-title">Lưu không gian 3D vào tài khoản</h3>
              <p className="room-modal-desc">
                Đặt tên cho góc máy của bạn. Bạn có thể lưu nhiều không gian khác nhau để quản lý và tùy biến bất kỳ lúc nào.
              </p>
              <form onSubmit={handleSaveRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Tên không gian (ví dụ: Góc làm việc tối giản)"
                  value={saveNameInput}
                  onChange={(e) => setSaveNameInput(e.target.value)}
                  required
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="room-action-btn"
                    onClick={() => setShowSaveModal(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRoom || !saveNameInput.trim()}
                    className="room-action-btn room-action-btn--success"
                  >
                    {isSavingRoom ? 'Đang lưu...' : 'Xác nhận lưu không gian'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Object to 3D Room */}
        {showAddItemModal && (
          <div className="room-modal-backdrop" onClick={() => setShowAddItemModal(false)}>
            <div className="room-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="room-modal-title">Thêm vật phẩm vào phòng 3D</h3>
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'products', label: 'Sản phẩm ROG / Thiết bị' },
                  { id: '3d', label: 'Mô hình 3D (.GLB)' },
                  { id: 'decor', label: 'Decor trang trí' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="room-action-btn"
                    style={{
                      background: addItemCategory === cat.id ? '#0284c7' : '#ffffff',
                      color: addItemCategory === cat.id ? '#ffffff' : '#0f172a',
                      borderColor: addItemCategory === cat.id ? '#0284c7' : '#cbd5e1',
                    }}
                    onClick={() => setAddItemCategory(cat.id as 'all' | 'products' | '3d' | 'decor')}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Tìm kiếm vật phẩm..."
                value={addItemSearch}
                onChange={(e) => setAddItemSearch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />

              <div className="room-catalog-grid">
                {/* 1. Products */}
                {(addItemCategory === 'all' || addItemCategory === 'products') &&
                  catalogProducts.filter(
                    (p) =>
                      addItemSearch.trim() === '' ||
                      p.name.toLowerCase().includes(addItemSearch.toLowerCase())
                  ).map((p) => {
                    const has3D = p.media?.some((m) => m.kind === 'model');
                    const thumbUrl =
                      p.media?.find((m) => m.kind === 'image')?.url ||
                      p.media?.[0]?.url ||
                      '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png';
                    return (
                      <div
                        key={p.id}
                        className="room-catalog-card"
                        onClick={() => handleAddObjectToRoom('product', p)}
                        title={`Thêm ${p.name} vào phòng 3D`}
                        style={{ position: 'relative' }}
                      >
                        {has3D && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              zIndex: 2,
                            }}
                          >
                            🧊 3D
                          </span>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbUrl}
                          alt={p.name}
                          className="room-catalog-card-thumb"
                        />
                        <span className="room-catalog-card-name">{p.name}</span>
                        <span className="room-catalog-card-category">{p.priceFrom.toLocaleString('vi-VN')} đ</span>
                      </div>
                    );
                  })}

                {/* 2. 3D Models */}
                {(addItemCategory === 'all' || addItemCategory === '3d') &&
                  PRESET_3D_MODELS.filter(
                    (m) =>
                      addItemSearch.trim() === '' ||
                      m.label.toLowerCase().includes(addItemSearch.toLowerCase())
                  ).map((m) => (
                    <div
                      key={m.id}
                      className="room-catalog-card"
                      onClick={() => handleAddObjectToRoom('decor', m)}
                      title={`Thêm ${m.label} vào phòng 3D`}
                    >
                      <div className="room-catalog-card-icon">🎮</div>
                      <span className="room-catalog-card-name">{m.label}</span>
                      <span className="room-catalog-card-category">Vật thể 3D GLB</span>
                    </div>
                  ))}

                {/* 3. Decor items */}
                {(addItemCategory === 'all' || addItemCategory === 'decor') &&
                  PRESET_DECOR_ASSETS.filter(
                    (d) =>
                      addItemSearch.trim() === '' ||
                      d.label.toLowerCase().includes(addItemSearch.toLowerCase())
                  ).map((d) => (
                    <div
                      key={d.id}
                      className="room-catalog-card"
                      onClick={() => handleAddObjectToRoom('decor', d)}
                      title={`Thêm ${d.label} vào phòng 3D`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.customImageUrl}
                        alt={d.label}
                        className="room-catalog-card-thumb"
                      />
                      <span className="room-catalog-card-name">{d.label}</span>
                      <span className="room-catalog-card-category">Decor trang trí</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="room-viewer-tip-bar">
          <span className="room-viewer-tip-icon">✦</span>
          <span>
            {viewerMode === 'edit'
              ? 'Chế độ tương tác khách hàng: Hãy kéo thả chuột hoặc chạm di chuyển để bố trí các thiết bị theo phong cách của bạn.'
              : 'Di chuột hoặc chạm vào các thiết bị để xem thông số và giá bán thực tế. Chuyển sang Tự tay sắp xếp để kéo thả vị trí.'}
          </span>
        </div>
      </div>

      {/* 2. Interactive Equipment Dock with Search, Filter & 3D Catalogue */}
      <section
        className="room-dock-section"
        aria-label="Danh sách thiết bị trong góc setup"
      >
        <div className="room-dock-header">
          <div className="room-dock-header-left">
            <span className="room-dock-title">Thiết bị trong góc setup</span>
            <span className="room-dock-count">
              {inRoomItemsCount} trong phòng / {dockDisplayItems.length} mẫu
            </span>
          </div>

          <div className="room-dock-header-right">
            <button
              type="button"
              className={`room-dock-3d-toggle ${
                dockOnly3D ? 'room-dock-3d-toggle--active' : ''
              }`}
              onClick={() => setDockOnly3D((prev) => !prev)}
              title="Lọc các thiết bị có phiên bản mô hình 3D tương tác"
            >
              <span className="room-dock-3d-cube-icon" aria-hidden="true">🎮</span>
              <span>Chỉ hiện bản 3D</span>
              <span className="room-dock-3d-count-badge">{models3DCount}</span>
            </button>
          </div>
        </div>

        {/* Controls: Search Input + Scope Filter Buttons */}
        <div className="room-dock-controls-bar">
          <div className="room-dock-search-wrap">
            <span className="room-dock-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="room-dock-search-input"
              placeholder="Tìm thiết bị hoặc mô hình 3D (màn hình, bàn phím, ghế, loa, PC...)..."
              value={dockSearch}
              onChange={(e) => setDockSearch(e.target.value)}
              aria-label="Tìm thiết bị góc setup"
            />
            {dockSearch && (
              <button
                type="button"
                className="room-dock-search-clear"
                onClick={() => setDockSearch('')}
                title="Xoá tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          <div
            className="room-dock-scope-group"
            role="tablist"
            aria-label="Phạm vi hiển thị thiết bị"
          >
            <button
              type="button"
              role="tab"
              aria-selected={dockScopeTab === 'all'}
              className={`room-dock-scope-btn ${
                dockScopeTab === 'all' ? 'room-dock-scope-btn--active' : ''
              }`}
              onClick={() => setDockScopeTab('all')}
            >
              Tất cả ({dockDisplayItems.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dockScopeTab === 'in_room'}
              className={`room-dock-scope-btn ${
                dockScopeTab === 'in_room' ? 'room-dock-scope-btn--active' : ''
              }`}
              onClick={() => setDockScopeTab('in_room')}
            >
              Trong phòng ({inRoomItemsCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dockScopeTab === 'available'}
              className={`room-dock-scope-btn ${
                dockScopeTab === 'available' ? 'room-dock-scope-btn--active' : ''
              }`}
              onClick={() => setDockScopeTab('available')}
            >
              + Thêm mới ({availableItemsCount})
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div
          className="room-dock-cat-scroll"
          role="tablist"
          aria-label="Danh mục thiết bị setup"
        >
          {DOCK_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={dockCategory === cat.id}
              className={`room-dock-cat-btn ${
                dockCategory === cat.id ? 'room-dock-cat-btn--active' : ''
              }`}
              onClick={() => setDockCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product & 3D Items Horizontal Scroll */}
        <div className="room-dock-scroll">
          {filteredDockItems.length === 0 ? (
            <div className="room-dock-empty-box">
              <span className="room-dock-empty-icon">🔍</span>
              <p className="room-dock-empty-text">
                Không tìm thấy thiết bị hoặc mô hình 3D phù hợp với bộ lọc hiện tại.
              </p>
              <button
                type="button"
                className="room-dock-reset-filter-btn"
                onClick={() => {
                  setDockSearch('');
                  setDockCategory('all');
                  setDockOnly3D(false);
                  setDockScopeTab('all');
                }}
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            filteredDockItems.map((item) => {
              const isItemActive =
                item.isInRoom &&
                item.roomItemId &&
                (selectedItemId === item.roomItemId ||
                  hoveredItemId === item.roomItemId);

              return (
                <div
                  key={item.id}
                  className={`room-dock-card ${
                    isItemActive ? 'room-dock-card--active' : ''
                  } ${item.isInRoom ? 'room-dock-card--in-room' : ''}`}
                  onClick={() => {
                    if (item.isInRoom && item.roomItemId) {
                      setSelectedItemId(item.roomItemId);
                      setHoveredItemId(item.roomItemId);
                    } else {
                      handleAddCatalogItemToRoom(item);
                    }
                  }}
                  onMouseEnter={() => {
                    if (item.isInRoom && item.roomItemId) {
                      setHoveredItemId(item.roomItemId);
                    }
                  }}
                  onMouseLeave={() => {
                    if (item.isInRoom && item.roomItemId) {
                      setHoveredItemId(null);
                    }
                  }}
                >
                  <div className="room-dock-card-media">
                    {/* 3D badge */}
                    {item.has3DModel && (
                      <span
                        className="room-dock-badge-3d"
                        title="Vật phẩm có mô hình 3D tương tác (.GLB)"
                      >
                        🎮 3D GLB
                      </span>
                    )}

                    {/* In-room badge */}
                    {item.isInRoom && (
                      <span
                        className="room-dock-badge-inroom"
                        title="Vật phẩm đang có trong phòng"
                      >
                        ✓ Trong phòng
                      </span>
                    )}

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="room-dock-card-img"
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 640px) 64px, 80px"
                    />
                  </div>

                  <div className="room-dock-card-body">
                    <span className="room-dock-card-cat">{item.categoryLabel}</span>
                    <span className="room-dock-card-name" title={item.title}>
                      {item.title}
                    </span>

                    <div className="room-dock-card-footer">
                      <span className="room-dock-card-price">
                        {item.price ? `${formatVND(item.price)} ₫` : 'Liên hệ'}
                      </span>

                      {item.isInRoom && item.roomItemId ? (
                        <button
                          type="button"
                          className="room-dock-action-btn room-dock-action-btn--remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCatalogItem(item.roomItemId!, item.title);
                          }}
                          title="Gỡ vật phẩm này khỏi không gian 3D"
                        >
                          ✕ Gỡ
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="room-dock-action-btn room-dock-action-btn--add"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCatalogItemToRoom(item);
                          }}
                          title="Thêm sản phẩm này vào không gian 3D"
                        >
                          + Thêm 3D
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. Combo Cart Builder Section */}
      <section
        className="room-combo-section"
        aria-label="Tùy chọn và mua combo setup"
      >
        <div className="room-combo-header">
          <div className="room-combo-eyebrow-row">
            <span className="room-combo-eyebrow">Combo góc setup</span>
            {setup.comboDiscountPct > 0 && (
              <span className="room-combo-badge">
                Ưu đãi Combo -{setup.comboDiscountPct}% khi mua từ 2 món
              </span>
            )}
          </div>
          <h2 className="room-combo-title">Tùy Chọn & Mua Trọn Bộ Setup</h2>
          <p className="room-combo-desc">
            Bạn có thể tích chọn hoặc bỏ tích những món đã sở hữu. Toàn bộ thiết
            bị được cam kết chính hãng và bảo hành tiêu chuẩn từ HGK.
          </p>
        </div>

        <div className="room-combo-controls-bar">
          <span className="room-combo-status-pill">
            Đã chọn {selectedProductItems.length} / {productItems.length} sản phẩm
          </span>
          <div className="room-combo-quick-btns">
            <button
              type="button"
              className="room-combo-text-btn"
              onClick={handleSelectAll}
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              className="room-combo-text-btn"
              onClick={handleDeselectAll}
            >
              Bỏ chọn tất cả
            </button>
          </div>
        </div>

        {/* List of Products in Setup */}
        <div className="room-combo-items-list">
          {productItems.map((item) => {
            const isChecked = selectedComboIds.has(item.id);
            const isOutOfStock = item.inStock === false;
            const imgUrl =
              item.resolvedImageUrl ||
              item.customImageUrl ||
              item.product?.media?.[0]?.url ||
              '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png';

            return (
              <div
                key={item.id}
                className={`room-combo-row ${
                  isOutOfStock ? 'room-combo-row--disabled' : ''
                }`}
              >
                <div className="room-combo-checkbox-wrap">
                  <input
                    type="checkbox"
                    id={`combo-item-${item.id}`}
                    className="room-combo-checkbox"
                    checked={isChecked}
                    disabled={isOutOfStock}
                    onChange={() => handleToggleComboItem(item.id)}
                  />
                </div>

                <div className="room-combo-row-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={item.product?.name || item.label || 'Sản phẩm'}
                    className="room-combo-row-img"
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 640px) 56px, 72px"
                  />
                </div>

                <div className="room-combo-row-info">
                  <div className="room-combo-row-title-row">
                    {item.product ? (
                      <Link
                        href={`/${item.product.categoryId}/${item.product.slug}`}
                        className="room-combo-row-title"
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <span className="room-combo-row-title">
                        {item.label || 'Sản phẩm'}
                      </span>
                    )}
                  </div>
                  {item.variant?.name && (
                    <span className="room-combo-row-spec">
                      Phiên bản: {item.variant.name}
                    </span>
                  )}
                </div>

                <div className="room-combo-row-price-col">
                  <span className="room-combo-row-price">
                    {item.price ? `${formatVND(item.price)} ₫` : 'Liên hệ'}
                  </span>
                  <span
                    className={`room-combo-row-stock ${
                      !isOutOfStock
                        ? 'room-combo-row-stock--instock'
                        : 'room-combo-row-stock--out'
                    }`}
                  >
                    {!isOutOfStock ? 'Còn hàng' : 'Hết hàng'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Calculation Summary */}
        <div className="room-combo-summary-box">
          <div className="room-combo-price-grid">
            <div className="room-combo-price-line">
              <span>Tạm tính ({selectedProductItems.length} món)</span>
              <span>{formatVND(comboPricing.originalTotal)} ₫</span>
            </div>

            {comboPricing.discountAmount > 0 && (
              <div className="room-combo-price-line room-combo-price-line--discount">
                <span>Ưu đãi Combo (-{setup.comboDiscountPct}%)</span>
                <span>-{formatVND(comboPricing.discountAmount)} ₫</span>
              </div>
            )}

            <div className="room-combo-price-line room-combo-price-line--total">
              <span>Tổng thanh toán</span>
              <span className="room-combo-total-amount">
                {formatVND(comboPricing.finalTotal)} ₫
              </span>
            </div>
          </div>

          {comboPricing.discountAmount > 0 && (
            <div className="room-combo-savings-pill">
              <span>✓</span>
              <span>
                Bạn tiết kiệm được {formatVND(comboPricing.discountAmount)} ₫ khi
                mua trọn gói combo này
              </span>
            </div>
          )}

          {selectedProductItems.length === 1 && setup.comboDiscountPct > 0 && (
            <div className="room-combo-desc">
              * Mẹo: Chọn thêm ít nhất 1 sản phẩm nữa để kích hoạt mức chiết khấu
              -{setup.comboDiscountPct}%.
            </div>
          )}

          <button
            type="button"
            className="room-combo-add-btn"
            disabled={selectedProductItems.length === 0}
            onClick={handleAddComboToCart}
          >
            <span>
              Thêm {selectedProductItems.length} sản phẩm vào giỏ hàng
            </span>
            <span>→</span>
          </button>

          {isAddedSuccess && (
            <div className="room-combo-success-alert" role="status">
              <span>✓</span>
              <span>
                Đã thêm {addedCount} sản phẩm vào giỏ hàng thành công!
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 4. Setup Philosophy & Specifications */}
      <section
        className="room-story-section"
        aria-labelledby="room-philosophy-title"
      >
        <h2 id="room-philosophy-title" className="room-story-title">
          Triết Lý Không Gian & Phối Ghép
        </h2>
        <p className="room-story-p">
          {setup.description ||
            'Không gian làm việc được tối ưu hóa góc nhìn, giảm tải áp lực cột sống và tăng hiệu suất công việc với sự kết hợp hài hòa giữa công nghệ và thẩm mỹ.'}
        </p>

        <div className="room-story-categories">
          <span className="room-story-categories-label">
            Các danh mục gợi ý trong không gian này
          </span>
          <div className="room-story-pills-row">
            <Link href="/monitor" className="room-category-pill">
              Màn hình OLED ↗
            </Link>
            <Link href="/keyboard" className="room-category-pill">
              Bàn phím cơ ↗
            </Link>
            <Link href="/speaker" className="room-category-pill">
              Hệ thống âm thanh ↗
            </Link>
            <Link href="/mouse" className="room-category-pill">
              Chuột công thái học ↗
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
