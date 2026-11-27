'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/catalog/types';
import { calculateComboPricing, hydrateRoomItems } from '@/lib/room/pricing';
import { PRESET_3D_MODELS, PRESET_DECOR_ASSETS } from '@/lib/room/sample-data';
import type { DecorAsset, Model3DAsset, RoomItem, RoomSetup } from '@/lib/room/types';
import { RoomStage } from '@/components/room/RoomStage';
import { RoomStage3D } from '@/components/room/RoomStage3D';
import {
  create3DModelAction,
  deleteDecorAssetAction,
  delete3DModelAction,
  saveRoomItemsBatchAction,
  saveRoomSetupAction,
  update3DModelAction,
  upload3DModelAction,
  uploadDecorAssetAction,
} from './actions';
import './admin-room-editor.css';

interface AdminRoomEditorProps {
  initialSetup: RoomSetup;
  initialItems: RoomItem[];
  catalogProducts: Product[];
  initialDecorAssets?: DecorAsset[];
  initial3DModels?: Model3DAsset[];
}

export { PRESET_DECOR_ASSETS, PRESET_3D_MODELS };

export function AdminRoomEditor({
  initialSetup,
  initialItems,
  catalogProducts,
  initialDecorAssets,
  initial3DModels,
}: AdminRoomEditorProps) {
  const [setup, setSetup] = useState<RoomSetup>(initialSetup);
  const [items, setItems] = useState<RoomItem[]>(() =>
    hydrateRoomItems(initialItems, catalogProducts),
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // View Mode: 3D Square Room vs 2D Plane
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // 3D GLB models library state
  const [models3d, setModels3d] = useState<Model3DAsset[]>(() =>
    initial3DModels && initial3DModels.length > 0 ? initial3DModels : PRESET_3D_MODELS
  );
  const [model3dCategory, setModel3dCategory] = useState<string>('all');
  const [model3dSearch, setModel3dSearch] = useState<string>('');
  const [selectedUpload3DFile, setSelectedUpload3DFile] = useState<File | null>(null);
  const [upload3DLabel, setUpload3DLabel] = useState<string>('');
  const [upload3DCategory, setUpload3DCategory] = useState<string>('tech');
  const [isUploading3D, setIsUploading3D] = useState<boolean>(false);
  const [model3dUploadError, setModel3dUploadError] = useState<string | null>(null);
  const [showUpload3DForm, setShowUpload3DForm] = useState<boolean>(false);
  const [autoAdd3DOnUpload, setAutoAdd3DOnUpload] = useState<boolean>(true);

  // Manual 3D Model addition state (Admin adds item record, file can be updated later)
  const [showManual3DForm, setShowManual3DForm] = useState<boolean>(false);
  const [manual3DLabel, setManual3DLabel] = useState<string>('');
  const [manual3DCategory, setManual3DCategory] = useState<string>('furniture');
  const [manual3DUrl, setManual3DUrl] = useState<string>('');
  const [isCreatingManual3D, setIsCreatingManual3D] = useState<boolean>(false);

  // Edit 3D Model state
  const [editingModel, setEditingModel] = useState<Model3DAsset | null>(null);
  const [editModelLabel, setEditModelLabel] = useState<string>('');
  const [editModelCategory, setEditModelCategory] = useState<string>('furniture');
  const [editModelUrl, setEditModelUrl] = useState<string>('');
  const [isUpdating3D, setIsUpdating3D] = useState<boolean>(false);
  const [deleting3DId, setDeleting3DId] = useState<string | null>(null);

  // Decor assets library state
  const [decorAssets, setDecorAssets] = useState<DecorAsset[]>(() =>
    initialDecorAssets && initialDecorAssets.length > 0
      ? initialDecorAssets
      : PRESET_DECOR_ASSETS,
  );
  const [decorCategory, setDecorCategory] = useState<string>('all');
  const [decorSearch, setDecorSearch] = useState('');
  const [isUploadingDecor, setIsUploadingDecor] = useState(false);
  const [decorUploadError, setDecorUploadError] = useState<string | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadFilePreview, setUploadFilePreview] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadCategory, setUploadCategory] = useState('plant');
  const [autoAddOnUpload, setAutoAddOnUpload] = useState(true);
  const [deletingDecorId, setDeletingDecorId] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Undo / Redo stacks
  const [history, setHistory] = useState<RoomItem[][]>([]);
  const [future, setFuture] = useState<RoomItem[][]>([]);

  // Active panel tab
  const [activeTab, setActiveTab] = useState<'catalog' | 'models3d' | 'decor' | 'layers' | 'settings'>('models3d');

  // Search filter for catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Custom decor input
  const [customDecorUrl, setCustomDecorUrl] = useState('');
  const [customDecorLabel, setCustomDecorLabel] = useState('');

  // Status feedback
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Push state to history before changing
  const pushHistory = useCallback(
    (newItems: RoomItem[]) => {
      setHistory((prev) => [...prev, items]);
      setFuture([]);
      setItems(newItems);
    },
    [items],
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [items, ...prev]);
    setItems(previous);
  }, [history, items]);

  // Redo
  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, items]);
    setItems(next);
  }, [future, items]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Update item
  const handleUpdateItem = useCallback(
    (updated: RoomItem) => {
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    },
    [],
  );

  // Delete item
  const handleDeleteItem = useCallback(
    (id: string) => {
      const nextItems = items.filter((item) => item.id !== id);
      pushHistory(nextItems);
      if (selectedItemId === id) setSelectedItemId(null);
    },
    [items, pushHistory, selectedItemId],
  );

  // Add product from catalog
  const handleAddProduct = useCallback(
    (product: Product) => {
      const nextZ = items.reduce((max, it) => Math.max(max, it.zIndex), 0) + 1;
      const defaultVariant = product.variants[0];
      const newItem: RoomItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        setupId: setup.id,
        itemType: 'product',
        productId: product.id,
        variantId: defaultVariant?.id || null,
        customImageUrl: null,
        label: product.name,
        xPct: 50.0,
        yPct: 65.0,
        widthPct: 24.0,
        rotation: 0,
        flipX: false,
        zIndex: nextZ,
      };

      const hydrated = hydrateRoomItems([newItem], catalogProducts)[0];
      pushHistory([...items, hydrated]);
      setSelectedItemId(newItem.id);
    },
    [catalogProducts, items, pushHistory, setup.id],
  );

  // Add decor item
  const handleAddDecor = useCallback(
    (imageUrl: string, label: string) => {
      if (!imageUrl) return;
      const nextZ = items.reduce((max, it) => Math.max(max, it.zIndex), 0) + 1;
      const newItem: RoomItem = {
        id: `decor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        setupId: setup.id,
        itemType: 'decor',
        productId: null,
        variantId: null,
        customImageUrl: imageUrl,
        label: label || 'Vật phẩm trang trí',
        xPct: 35.0,
        yPct: 65.0,
        widthPct: 14.0,
        rotation: 0,
        flipX: false,
        zIndex: nextZ,
        resolvedImageUrl: imageUrl,
        inStock: true,
      };

      pushHistory([...items, newItem]);
      setSelectedItemId(newItem.id);
    },
    [items, pushHistory, setup.id],
  );

  // Add 3D GLB model item
  const handleAdd3DModel = useCallback(
    (modelUrl: string, label: string) => {
      if (!modelUrl) return;
      const nextZ = items.reduce((max, it) => Math.max(max, it.zIndex), 0) + 1;
      const newItem: RoomItem = {
        id: `glb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        setupId: setup.id,
        itemType: 'decor',
        productId: null,
        variantId: null,
        customImageUrl: modelUrl,
        label: label || 'Mô hình 3D GLB',
        xPct: 50.0,
        yPct: 50.0,
        widthPct: 24.0,
        rotation: 0,
        flipX: false,
        zIndex: nextZ,
        resolvedImageUrl: modelUrl,
        inStock: true,
      };

      pushHistory([...items, newItem]);
      setSelectedItemId(newItem.id);
      setViewMode('3d');
    },
    [items, pushHistory, setup.id],
  );

  // Handle 3D file selection (.glb)
  const handleFileChange3D = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb')) {
      setModel3dUploadError('Tệp phải có định dạng .glb (glTF binary).');
      return;
    }

    setSelectedUpload3DFile(file);
    setModel3dUploadError(null);

    if (!upload3DLabel) {
      const clean = file.name
        .replace(/\.glb$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      setUpload3DLabel(clean.charAt(0).toUpperCase() + clean.slice(1));
    }
  };

  // Upload 3D GLB model
  const handleUpload3DModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpload3DFile) return;

    setIsUploading3D(true);
    setModel3dUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedUpload3DFile);
      if (upload3DLabel) formData.append('label', upload3DLabel);
      if (upload3DCategory) formData.append('category', upload3DCategory);

      const res = await upload3DModelAction(formData);
      if (!res.success || !res.model) {
        throw new Error(res.error || 'Không tải lên được mô hình 3D.');
      }

      setModels3d((prev) => [res.model!, ...prev]);

      if (autoAdd3DOnUpload) {
        handleAdd3DModel(res.model.modelUrl, res.model.label);
      }

      setSelectedUpload3DFile(null);
      setUpload3DLabel('');
      setShowUpload3DForm(false);
      setStatusMessage({
        type: 'success',
        text: `Đã tải lên mô hình 3D "${res.model.label}" thành công!`,
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải lên mô hình 3D.';
      setModel3dUploadError(msg);
    } finally {
      setIsUploading3D(false);
    }
  };

  // Create 3D model asset manually without immediate GLB upload (files can be updated later)
  const handleCreateManual3D = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual3DLabel.trim()) return;

    setIsCreatingManual3D(true);
    try {
      const formData = new FormData();
      formData.append('label', manual3DLabel.trim());
      formData.append('category', manual3DCategory);
      if (manual3DUrl.trim()) formData.append('modelUrl', manual3DUrl.trim());

      const res = await create3DModelAction(formData);
      if (!res.success || !res.model) {
        throw new Error(res.error || 'Không tạo được vật thể 3D.');
      }

      setModels3d((prev) => [res.model!, ...prev]);
      setManual3DLabel('');
      setManual3DUrl('');
      setShowManual3DForm(false);
      setStatusMessage({
        type: 'success',
        text: `Đã thêm vật thể 3D "${res.model.label}" vào danh sách!`,
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo vật thể 3D.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsCreatingManual3D(false);
    }
  };

  // Start editing 3D model
  const handleStartEditModel = (model: Model3DAsset) => {
    setEditingModel(model);
    setEditModelLabel(model.label);
    setEditModelCategory(model.category || 'furniture');
    setEditModelUrl(model.modelUrl || '');
  };

  // Submit edit 3D model
  const handleUpdate3DModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;

    setIsUpdating3D(true);
    try {
      const formData = new FormData();
      formData.append('id', editingModel.id);
      formData.append('label', editModelLabel.trim());
      formData.append('category', editModelCategory);
      formData.append('modelUrl', editModelUrl.trim());

      const res = await update3DModelAction(formData);
      if (!res.success || !res.model) {
        throw new Error(res.error || 'Không cập nhật được vật thể 3D.');
      }

      setModels3d((prev) => prev.map((m) => (m.id === editingModel.id ? res.model! : m)));
      setEditingModel(null);
      setStatusMessage({
        type: 'success',
        text: `Đã cập nhật vật thể 3D "${res.model.label}"!`,
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật vật thể 3D.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsUpdating3D(false);
    }
  };

  // Delete 3D model
  const handleDelete3DModel = async (model: Model3DAsset) => {
    if (!window.confirm(`Xác nhận xóa vật thể 3D "${model.label}" khỏi thư viện?`)) return;

    setDeleting3DId(model.id);
    try {
      const formData = new FormData();
      formData.append('id', model.id);
      const res = await delete3DModelAction(formData);
      if (!res.success) {
        throw new Error(res.error || 'Không xóa được vật thể 3D.');
      }

      setModels3d((prev) => prev.filter((m) => m.id !== model.id));
      setStatusMessage({
        type: 'success',
        text: `Đã xóa vật thể 3D "${model.label}"!`,
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xóa vật thể 3D.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setDeleting3DId(null);
    }
  };


  // Handle decor file selection for upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedUploadFile(file);
    setDecorUploadError(null);
    const objectUrl = URL.createObjectURL(file);
    setUploadFilePreview(objectUrl);

    if (!uploadLabel) {
      const clean = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      setUploadLabel(clean.charAt(0).toUpperCase() + clean.slice(1));
    }
  };

  // Upload decor asset to Supabase Storage
  const handleUploadDecor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile) return;

    setIsUploadingDecor(true);
    setDecorUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      if (uploadLabel) formData.append('label', uploadLabel);
      if (uploadCategory) formData.append('category', uploadCategory);

      const res = await uploadDecorAssetAction(formData);
      if (!res.success || !res.asset) {
        throw new Error(res.error || 'Không tải lên được đồ trang trí.');
      }

      setDecorAssets((prev) => [res.asset!, ...prev]);

      if (autoAddOnUpload) {
        handleAddDecor(res.asset.customImageUrl, res.asset.label);
      }

      setSelectedUploadFile(null);
      setUploadFilePreview(null);
      setUploadLabel('');
      setShowUploadForm(false);
      setStatusMessage({
        type: 'success',
        text: `Đã tải lên "${res.asset.label}" vào kho decor thành công!`,
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải ảnh đồ trang trí.';
      setDecorUploadError(msg);
    } finally {
      setIsUploadingDecor(false);
    }
  };

  // Delete decor asset from Supabase Storage
  const handleDeleteDecorAsset = async (asset: DecorAsset) => {
    if (!asset.storagePath) return;
    if (!window.confirm(`Xóa đồ trang trí "${asset.label}" khỏi thư viện?`)) return;

    setDeletingDecorId(asset.id);
    try {
      const formData = new FormData();
      formData.append('storagePath', asset.storagePath);
      const res = await deleteDecorAssetAction(formData);
      if (!res.success) {
        throw new Error(res.error || 'Không thể xóa đồ trang trí.');
      }

      setDecorAssets((prev) => prev.filter((a) => a.id !== asset.id));
      setStatusMessage({
        type: 'success',
        text: `Đã xóa "${asset.label}" khỏi thư viện decor!`,
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xóa đồ trang trí.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setDeletingDecorId(null);
    }
  };


  // Save Batch (items + setup metadata)
  const handleSaveBatch = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const cleanItemsPayload = items.map((it) => ({
        id: it.id.startsWith('item_') || it.id.startsWith('decor_') ? undefined : it.id,
        setupId: setup.id,
        itemType: it.itemType,
        productId: it.productId,
        variantId: it.variantId,
        customImageUrl: it.customImageUrl,
        label: it.label,
        xPct: it.xPct,
        yPct: it.yPct,
        widthPct: it.widthPct,
        rotation: it.rotation,
        flipX: it.flipX,
        zIndex: it.zIndex,
      }));

      const res = await saveRoomItemsBatchAction(setup.id, cleanItemsPayload);
      if (!res.success) {
        throw new Error(res.error || 'Không thể lưu vật phẩm.');
      }

      setStatusMessage({ type: 'success', text: 'Đã lưu bố cục phòng thành công!' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu bố cục.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter catalog products
  const filteredProducts = catalogProducts.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter 3D models
  const filtered3DModels = models3d.filter((m) => {
    const matchesSearch =
      model3dSearch.trim() === '' ||
      m.label.toLowerCase().includes(model3dSearch.toLowerCase());
    const matchesCategory =
      model3dCategory === 'all' || m.category === model3dCategory;
    return matchesSearch && matchesCategory;
  });

  const comboPricing = calculateComboPricing(items, setup.comboDiscountPct);

  return (
    <div className="admin-room-editor">
      {/* Top Header Bar */}
      <header className="admin-room-header">
        <div className="admin-room-header-left">
          <Link href="/admin/rooms" className="admin-room-back-link">
            ← Tất cả góc setup
          </Link>
          <div className="admin-room-title-group">
            <h1 className="admin-room-title">{setup.title}</h1>
            <span
              className={`admin-room-status-badge admin-room-status-badge--${setup.status}`}
            >
              {setup.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
            </span>
          </div>
        </div>

        <div className="admin-room-header-actions">
          {/* 3D vs 2D View Switcher */}
          <div className="admin-room-viewmode-toggle">
            <button
              type="button"
              className={`admin-room-viewmode-btn ${viewMode === '3d' ? 'admin-room-viewmode-btn--active' : ''}`}
              onClick={() => setViewMode('3d')}
            >
              🎮 Phòng 3D hình vuông
            </button>
            <button
              type="button"
              className={`admin-room-viewmode-btn ${viewMode === '2d' ? 'admin-room-viewmode-btn--active' : ''}`}
              onClick={() => setViewMode('2d')}
            >
              🖼️ Bố cục 2D phẳng
            </button>
          </div>

          <button
            type="button"
            className="admin-room-btn"
            title="Hoàn tác (Ctrl+Z)"
            disabled={history.length === 0}
            onClick={handleUndo}
          >
            ↶ Hoàn tác ({history.length})
          </button>
          <button
            type="button"
            className="admin-room-btn"
            title="Làm lại (Ctrl+Y)"
            disabled={future.length === 0}
            onClick={handleRedo}
          >
            ↷ Làm lại ({future.length})
          </button>

          <button
            type="button"
            className="admin-room-btn admin-room-btn--primary"
            disabled={isSaving}
            onClick={handleSaveBatch}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu bố cục phòng'}
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {statusMessage && (
        <div
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            background: statusMessage.type === 'success' ? '#ecfdf5' : '#fff1f2',
            color: statusMessage.type === 'success' ? '#047857' : '#be123c',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecdd3'}`,
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Workspace: 2-column Canvas and Panel */}
      <div className="admin-room-workspace">
        {/* Left Column: Interactive Canvas Stage */}
        <div className="admin-room-canvas-container">
          {viewMode === '3d' ? (
            <RoomStage3D
              setup={setup}
              items={items}
              mode="edit"
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          ) : (
            <RoomStage
              setup={setup}
              items={items}
              mode="edit"
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {/* Quick Stats Bar */}
          <div className="admin-room-canvas-stats">
            <div>
              Tổng vật phẩm: <span className="admin-room-stats-highlight">{items.length}</span> (
              {items.filter((i) => i.itemType === 'product').length} sản phẩm,{' '}
              {items.filter((i) => i.itemType === 'decor').length} decor/3D)
            </div>
            <div>
              Tỷ lệ khung: <span className="admin-room-stats-highlight">{setup.aspectRatio || 1.6}</span>
            </div>
            <div>
              Chiết khấu combo: <span className="admin-room-stats-highlight">{setup.comboDiscountPct}%</span>
            </div>
            <div>
              Tổng giá combo: <span className="admin-room-stats-highlight">{comboPricing.finalTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-tab Side Panel */}
        <div className="admin-room-panel">
          <div className="admin-room-panel-tabs">
            <button
              type="button"
              className={`admin-room-tab-btn ${activeTab === 'models3d' ? 'admin-room-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('models3d')}
            >
              Mô hình 3D ({models3d.length})
            </button>
            <button
              type="button"
              className={`admin-room-tab-btn ${activeTab === 'catalog' ? 'admin-room-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              Sản phẩm ({catalogProducts.length})
            </button>
            <button
              type="button"
              className={`admin-room-tab-btn ${activeTab === 'decor' ? 'admin-room-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('decor')}
            >
              Decor ({decorAssets.length})
            </button>
            <button
              type="button"
              className={`admin-room-tab-btn ${activeTab === 'layers' ? 'admin-room-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              Lớp ({items.length})
            </button>
            <button
              type="button"
              className={`admin-room-tab-btn ${activeTab === 'settings' ? 'admin-room-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Cài đặt
            </button>
          </div>

          <div className="admin-room-tab-content">
            {/* Tab: 3D Models & GLB Upload */}
            {activeTab === 'models3d' && (
              <>
                {/* Search & Actions Bar */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Tìm mô hình 3D..."
                    value={model3dSearch}
                    onChange={(e) => setModel3dSearch(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                  <button
                    type="button"
                    className="admin-room-btn"
                    style={{ padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      setShowUpload3DForm((v) => !v);
                      if (!showUpload3DForm) setShowManual3DForm(false);
                    }}
                  >
                    {showUpload3DForm ? 'Đóng tải lên' : '+ Tải file .GLB'}
                  </button>
                  <button
                    type="button"
                    className="admin-room-btn admin-room-btn--primary"
                    style={{ padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      setShowManual3DForm((v) => !v);
                      if (!showManual3DForm) setShowUpload3DForm(false);
                    }}
                  >
                    {showManual3DForm ? 'Đóng thêm' : '+ Thêm vật thể'}
                  </button>
                </div>

                {/* Form: Manual 3D Model Creation (Admin sets up item, file can be uploaded/updated later) */}
                {showManual3DForm && (
                  <form onSubmit={handleCreateManual3D} className="admin-decor-upload-card">
                    <h4 className="admin-decor-upload-title">Đăng ký vật thể 3D mới vào thư viện</h4>
                    <p className="admin-decor-upload-desc">
                      Tạo trước tên và thông tin vật thể để khách hàng chọn lựa. Tệp mô hình 3D có thể cập nhật sau.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Tên vật thể (ví dụ: Ghế công thái học Herman Miller)"
                        value={manual3DLabel}
                        onChange={(e) => setManual3DLabel(e.target.value)}
                        required
                        style={{
                          padding: '6px 8px',
                          fontSize: '12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          value={manual3DCategory}
                          onChange={(e) => setManual3DCategory(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            fontSize: '12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            background: '#ffffff',
                          }}
                        >
                          <option value="furniture">Bàn ghế / Nội thất</option>
                          <option value="tech">Công nghệ / Thiết bị</option>
                          <option value="audio">Âm thanh / Loa</option>
                          <option value="decor">Decor trang trí</option>
                          <option value="custom">Tùy biến khác</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Đường dẫn file GLB (tùy chọn)"
                          value={manual3DUrl}
                          onChange={(e) => setManual3DUrl(e.target.value)}
                          style={{
                            flex: 1.5,
                            padding: '6px 8px',
                            fontSize: '12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingManual3D || !manual3DLabel.trim()}
                      className="admin-room-btn admin-room-btn--primary"
                      style={{ padding: '6px 12px', fontSize: '12px', marginTop: '6px' }}
                    >
                      {isCreatingManual3D ? 'Đang thêm...' : 'Lưu vật thể vào thư viện'}
                    </button>
                  </form>
                )}

                {/* Form: Upload GLB 3D Model File */}
                {showUpload3DForm && (
                  <form onSubmit={handleUpload3DModel} className="admin-decor-upload-card">
                    <h4 className="admin-decor-upload-title">Tải lên mô hình 3D (.glb)</h4>
                    <p className="admin-decor-upload-desc">
                      Chấp nhận file định dạng nhị phân 3D chuẩn .glb (tối đa 35 MB).
                    </p>

                    <div className="admin-decor-upload-dropzone">
                      <input
                        type="file"
                        accept=".glb,model/gltf-binary"
                        onChange={handleFileChange3D}
                        style={{ fontSize: '12px' }}
                      />
                      {selectedUpload3DFile && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#0369a1', fontWeight: 500 }}>
                          📁 Đã chọn: {selectedUpload3DFile.name} ({(selectedUpload3DFile.size / 1024).toFixed(1)} KB)
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Tên mô hình 3D (ví dụ: Bàn phím cơ Custom)"
                        value={upload3DLabel}
                        onChange={(e) => setUpload3DLabel(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                        }}
                      />
                      <select
                        value={upload3DCategory}
                        onChange={(e) => setUpload3DCategory(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          fontSize: '12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          background: '#ffffff',
                        }}
                      >
                        <option value="furniture">Bàn ghế</option>
                        <option value="tech">Công nghệ</option>
                        <option value="audio">Âm thanh</option>
                        <option value="decor">Decor trang trí</option>
                        <option value="custom">Tùy biến khác</option>
                      </select>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoAdd3DOnUpload}
                        onChange={(e) => setAutoAdd3DOnUpload(e.target.checked)}
                      />
                      <span>Tự động đưa vào phòng 3D sau khi tải lên</span>
                    </label>

                    {model3dUploadError && (
                      <div className="admin-decor-error-alert" role="alert">
                        {model3dUploadError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isUploading3D || !selectedUpload3DFile}
                      className="admin-room-btn admin-room-btn--primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      {isUploading3D ? 'Đang tải lên...' : 'Xác nhận tải lên thư viện 3D'}
                    </button>
                  </form>
                )}

                {/* Form: Inline Edit 3D Model Modal */}
                {editingModel && (
                  <form onSubmit={handleUpdate3DModel} className="admin-decor-upload-card" style={{ borderColor: '#0284c7', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 className="admin-decor-upload-title" style={{ color: '#0369a1' }}>
                        Chỉnh sửa vật thể 3D: {editingModel.label}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setEditingModel(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#64748b' }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      <input
                        type="text"
                        placeholder="Tên vật thể"
                        value={editModelLabel}
                        onChange={(e) => setEditModelLabel(e.target.value)}
                        required
                        style={{
                          padding: '6px 8px',
                          fontSize: '12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          value={editModelCategory}
                          onChange={(e) => setEditModelCategory(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            fontSize: '12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            background: '#ffffff',
                          }}
                        >
                          <option value="furniture">Bàn ghế</option>
                          <option value="tech">Công nghệ</option>
                          <option value="audio">Âm thanh</option>
                          <option value="decor">Decor trang trí</option>
                          <option value="custom">Tùy biến khác</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Đường dẫn file GLB"
                          value={editModelUrl}
                          onChange={(e) => setEditModelUrl(e.target.value)}
                          style={{
                            flex: 1.5,
                            padding: '6px 8px',
                            fontSize: '12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button
                        type="submit"
                        disabled={isUpdating3D || !editModelLabel.trim()}
                        className="admin-room-btn admin-room-btn--primary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        {isUpdating3D ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingModel(null)}
                        className="admin-room-btn"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}

                {/* Category Filter Pills */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `Tất cả (${models3d.length})` },
                    { id: 'furniture', label: 'Bàn ghế' },
                    { id: 'tech', label: 'Công nghệ' },
                    { id: 'audio', label: 'Âm thanh' },
                    { id: 'decor', label: 'Decor' },
                    { id: 'custom', label: 'Tùy biến' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="admin-room-btn"
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        background: model3dCategory === cat.id ? '#0284c7' : '#ffffff',
                        color: model3dCategory === cat.id ? '#ffffff' : '#0f172a',
                        borderColor: model3dCategory === cat.id ? '#0284c7' : '#cbd5e1',
                      }}
                      onClick={() => setModel3dCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 3D Model Cards List with Full CRUD: Add to 3D, Edit, Delete */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filtered3DModels.map((model) => (
                    <div key={model.id} className="admin-model3d-card">
                      <div className="admin-model3d-icon">🎮</div>
                      <div className="admin-model3d-info">
                        <h5 className="admin-model3d-title">{model.label}</h5>
                        <div className="admin-model3d-meta">
                          <span className="admin-model3d-badge">.GLB 3D</span>
                          <span>Danh mục: {model.category || 'Chung'}</span>
                          {model.fileSize ? <span>({(model.fileSize / 1024).toFixed(1)} KB)</span> : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="admin-room-btn admin-room-btn--primary"
                          style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                          onClick={() => handleAdd3DModel(model.modelUrl, model.label)}
                          title="Đặt vật thể này vào phòng 3D hiện tại"
                        >
                          + Đưa vào 3D
                        </button>
                        <button
                          type="button"
                          className="admin-room-btn"
                          style={{ padding: '4px 6px', fontSize: '11px' }}
                          onClick={() => handleStartEditModel(model)}
                          title="Chỉnh sửa thông tin vật thể"
                        >
                          ✎ Sửa
                        </button>
                        <button
                          type="button"
                          className="admin-room-btn"
                          style={{ padding: '4px 6px', fontSize: '11px', color: '#be123c', borderColor: '#fecdd3' }}
                          disabled={deleting3DId === model.id}
                          onClick={() => handleDelete3DModel(model)}
                          title="Xóa vật thể khỏi thư viện"
                        >
                          {deleting3DId === model.id ? '...' : '✕'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {/* Tab 1: Catalog */}
            {activeTab === 'catalog' && (
              <>
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm theo tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['all', 'monitor', 'keyboard', 'mouse', 'speaker', 'monitor-led'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className="admin-room-btn"
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        background: selectedCategory === cat ? '#0284c7' : '#ffffff',
                        color: selectedCategory === cat ? '#ffffff' : '#0f172a',
                        borderColor: selectedCategory === cat ? '#0284c7' : '#cbd5e1',
                      }}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat === 'all'
                        ? 'Tất cả'
                        : cat === 'monitor'
                          ? 'Màn hình'
                          : cat === 'keyboard'
                            ? 'Bàn phím'
                            : cat === 'mouse'
                              ? 'Chuột'
                              : cat === 'speaker'
                                ? 'Loa'
                                : 'Đèn'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredProducts.map((prod) => (
                    <div key={prod.id} className="admin-catalog-item-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={prod.media[0]?.url || '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png'}
                        alt={prod.name}
                        className="admin-catalog-item-thumb"
                      />
                      <div className="admin-catalog-item-info">
                        <h4 className="admin-catalog-item-name">{prod.name}</h4>
                        <p className="admin-catalog-item-price">
                          {prod.priceFrom.toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <button
                        type="button"
                        className="admin-room-btn"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => handleAddProduct(prod)}
                      >
                        + Thêm
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Tab 2: Decor Library, Upload & Custom URL */}
            {activeTab === 'decor' && (
              <>
                {/* Search & Actions Bar */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Tìm kiếm đồ decor..."
                    value={decorSearch}
                    onChange={(e) => setDecorSearch(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                  <button
                    type="button"
                    className="admin-room-btn admin-room-btn--primary"
                    style={{ padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                    onClick={() => setShowUploadForm((v) => !v)}
                  >
                    {showUploadForm ? 'Đóng tải lên' : '+ Tải ảnh lên'}
                  </button>
                </div>

                {/* Upload Card for PNG / WebP */}
                {showUploadForm && (
                  <form
                    onSubmit={handleUploadDecor}
                    className="admin-decor-upload-card"
                  >
                    <h4 className="admin-decor-upload-title">Tải ảnh Decor lên Supabase Storage</h4>
                    <p className="admin-decor-upload-desc">
                      Chấp nhận PNG tách nền trong suốt, WebP hoặc JPEG (tối đa 10 MB).
                    </p>

                    <div className="admin-decor-upload-dropzone">
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg"
                        onChange={handleFileChange}
                        style={{ fontSize: '12px' }}
                      />
                      {uploadFilePreview && (
                        <div className="admin-decor-preview-wrap">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={uploadFilePreview}
                            alt="Xem trước ảnh decor"
                            className="admin-decor-preview-img"
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Tên nhãn (ví dụ: Chậu sen đá)"
                        value={uploadLabel}
                        onChange={(e) => setUploadLabel(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                        }}
                      />
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          fontSize: '12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          background: '#ffffff',
                        }}
                      >
                        <option value="plant">Cây cảnh</option>
                        <option value="tech">Công nghệ</option>
                        <option value="light">Ánh sáng</option>
                        <option value="lifestyle">Đời sống</option>
                        <option value="custom">Tùy biến</option>
                      </select>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoAddOnUpload}
                        onChange={(e) => setAutoAddOnUpload(e.target.checked)}
                      />
                      <span>Thêm ngay vào phòng sau khi tải lên</span>
                    </label>

                    {decorUploadError && (
                      <div className="admin-decor-error-alert" role="alert">
                        {decorUploadError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isUploadingDecor || !selectedUploadFile}
                      className="admin-room-btn admin-room-btn--primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      {isUploadingDecor ? 'Đang tải lên Supabase...' : 'Xác nhận tải lên kho Decor'}
                    </button>
                  </form>
                )}

                {/* Category Filter Pills */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `Tất cả (${decorAssets.length})` },
                    { id: 'plant', label: 'Cây cảnh' },
                    { id: 'tech', label: 'Công nghệ' },
                    { id: 'light', label: 'Ánh sáng' },
                    { id: 'lifestyle', label: 'Đời sống' },
                    { id: 'custom', label: `Kho Storage (${decorAssets.filter((a) => a.storagePath).length})` },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="admin-room-btn"
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        background: decorCategory === cat.id ? '#0284c7' : '#ffffff',
                        color: decorCategory === cat.id ? '#ffffff' : '#0f172a',
                        borderColor: decorCategory === cat.id ? '#0284c7' : '#cbd5e1',
                      }}
                      onClick={() => setDecorCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Decor Assets List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {decorAssets
                    .filter((asset) => {
                      const matchesCategory =
                        decorCategory === 'all'
                          ? true
                          : decorCategory === 'custom'
                            ? Boolean(asset.storagePath)
                            : asset.category === decorCategory;
                      const matchesSearch =
                        decorSearch.trim() === '' ||
                        asset.label.toLowerCase().includes(decorSearch.toLowerCase());
                      return matchesCategory && matchesSearch;
                    })
                    .map((asset) => (
                      <div key={asset.id || asset.customImageUrl} className="admin-catalog-item-card admin-decor-item-card">
                        <div className="admin-decor-thumb-checkerboard">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.customImageUrl}
                            alt={asset.label}
                            className="admin-catalog-item-thumb"
                          />
                        </div>
                        <div className="admin-catalog-item-info">
                          <h4 className="admin-catalog-item-name">{asset.label}</h4>
                          <span className="admin-decor-source-badge">
                            {asset.storagePath ? 'Kho Supabase' : 'Mẫu sẵn'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="admin-room-btn"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => handleAddDecor(asset.customImageUrl, asset.label)}
                          >
                            + Thêm
                          </button>
                          {asset.storagePath && (
                            <button
                              type="button"
                              className="admin-room-btn"
                              style={{ padding: '4px 6px', fontSize: '11px', color: '#be123c', borderColor: '#fecdd3' }}
                              disabled={deletingDecorId === asset.id}
                              title="Xóa khỏi kho lưu trữ"
                              onClick={() => handleDeleteDecorAsset(asset)}
                            >
                              {deletingDecorId === asset.id ? '...' : '✕'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

                {/* Custom URL Input Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Tải URL ảnh Decor tùy chỉnh:</label>
                  <input
                    type="text"
                    placeholder="Tên nhãn (ví dụ: Chậu sen đá)"
                    value={customDecorLabel}
                    onChange={(e) => setCustomDecorLabel(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                    }}
                  />
                  <input
                    type="url"
                    placeholder="https://.../decor.png"
                    value={customDecorUrl}
                    onChange={(e) => setCustomDecorUrl(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                    }}
                  />
                  <button
                    type="button"
                    className="admin-room-btn"
                    disabled={!customDecorUrl}
                    onClick={() => {
                      handleAddDecor(customDecorUrl, customDecorLabel || 'Decor tùy chỉnh');
                      setCustomDecorUrl('');
                      setCustomDecorLabel('');
                    }}
                  >
                    + Thêm ảnh Decor vào phòng
                  </button>
                </div>
              </>
            )}

            {/* Tab 3: Layers */}
            {activeTab === 'layers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items
                  .slice()
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((item) => {
                    const isSelected = selectedItemId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`admin-layer-row ${isSelected ? 'admin-layer-row--selected' : ''}`}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <div className="admin-layer-info">
                          <h5 className="admin-layer-label">
                            {item.label || (item.itemType === 'product' ? 'Sản phẩm' : 'Decor')}
                          </h5>
                          <span className="admin-layer-meta">
                            Lớp: {item.zIndex} | Rộng: {item.widthPct}% | ({item.xPct}%, {item.yPct}%)
                          </span>
                        </div>
                        <div className="admin-layer-actions">
                          <button
                            type="button"
                            className="admin-layer-btn"
                            title="Tăng lớp"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateItem({ ...item, zIndex: item.zIndex + 1 });
                            }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="admin-layer-btn"
                            title="Giảm lớp"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateItem({ ...item, zIndex: Math.max(1, item.zIndex - 1) });
                            }}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="admin-layer-btn"
                            title="Xóa vật phẩm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item.id);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Tab 4: Room Settings */}
            {activeTab === 'settings' && (
              <form
                action={async (formData) => {
                  const res = await saveRoomSetupAction({ success: false }, formData);
                  if (res.error) {
                    setStatusMessage({ type: 'error', text: res.error });
                  } else if (res.setup) {
                    setSetup(res.setup);
                    setStatusMessage({ type: 'success', text: 'Cập nhật thông tin phòng thành công!' });
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <input type="hidden" name="id" value={setup.id} />
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600 }}>Tiêu đề phòng setup:</label>
                  <input
                    type="text"
                    name="title"
                    value={setup.title}
                    onChange={(e) => setSetup({ ...setup, title: e.target.value })}
                    required
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600 }}>Slug đường dẫn:</label>
                  <input
                    type="text"
                    name="slug"
                    value={setup.slug}
                    onChange={(e) => setSetup({ ...setup, slug: e.target.value })}
                    required
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600 }}>Trạng thái:</label>
                  <select
                    name="status"
                    value={setup.status}
                    onChange={(e) => setSetup({ ...setup, status: e.target.value as 'draft' | 'published' })}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    <option value="draft">Bản nháp (Draft)</option>
                    <option value="published">Xuất bản công khai (Published)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600 }}>Ảnh nền phòng setup:</label>
                  <input
                    type="text"
                    name="bgImageUrl"
                    value={setup.bgImageUrl}
                    onChange={(e) => setSetup({ ...setup, bgImageUrl: e.target.value })}
                    required
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600 }}>Tỷ lệ khung hình:</label>
                  <input
                    type="number"
                    step="0.05"
                    name="aspectRatio"
                    value={setup.aspectRatio}
                    onChange={(e) => setSetup({ ...setup, aspectRatio: parseFloat(e.target.value) || 1.6 })}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600 }}>Chiết khấu mua combo (%):</label>
                  <input
                    type="number"
                    name="comboDiscountPct"
                    min="0"
                    max="100"
                    value={setup.comboDiscountPct}
                    onChange={(e) => setSetup({ ...setup, comboDiscountPct: parseInt(e.target.value, 10) || 0 })}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600 }}>Mô tả góc setup:</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={setup.description}
                    onChange={(e) => setSetup({ ...setup, description: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <button type="submit" className="admin-room-btn admin-room-btn--primary">
                  Cập nhật cấu hình phòng
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
