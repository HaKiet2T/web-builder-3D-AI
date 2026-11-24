'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/catalog/types';
import { calculateComboPricing, hydrateRoomItems } from '@/lib/room/pricing';
import { PRESET_DECOR_ASSETS } from '@/lib/room/sample-data';
import type { DecorAsset, RoomItem, RoomSetup } from '@/lib/room/types';
import { RoomStage } from '@/components/room/RoomStage';
import {
  deleteDecorAssetAction,
  saveRoomItemsBatchAction,
  saveRoomSetupAction,
  uploadDecorAssetAction,
} from './actions';
import './admin-room-editor.css';

interface AdminRoomEditorProps {
  initialSetup: RoomSetup;
  initialItems: RoomItem[];
  catalogProducts: Product[];
  initialDecorAssets?: DecorAsset[];
}

export { PRESET_DECOR_ASSETS };

export function AdminRoomEditor({
  initialSetup,
  initialItems,
  catalogProducts,
  initialDecorAssets,
}: AdminRoomEditorProps) {
  const [setup, setSetup] = useState<RoomSetup>(initialSetup);
  const [items, setItems] = useState<RoomItem[]>(() =>
    hydrateRoomItems(initialItems, catalogProducts),
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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
  const [activeTab, setActiveTab] = useState<'catalog' | 'decor' | 'layers' | 'settings'>('catalog');

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
          <RoomStage
            setup={setup}
            items={items}
            mode="edit"
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
          />

          {/* Quick Stats Bar */}
          <div className="admin-room-canvas-stats">
            <div>
              Tổng vật phẩm: <span className="admin-room-stats-highlight">{items.length}</span> (
              {items.filter((i) => i.itemType === 'product').length} sản phẩm,{' '}
              {items.filter((i) => i.itemType === 'decor').length} decor)
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
