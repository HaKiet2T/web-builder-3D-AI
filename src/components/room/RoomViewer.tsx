'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { RoomStage } from './RoomStage';
import type { RoomItem, RoomSetupWithItems } from '@/lib/room/types';
import { calculateComboPricing } from '@/lib/room/pricing';
import { trackRoomEvent, type RoomAnalyticsHandler } from '@/lib/room/analytics';
import { useCartStore } from '@/store/cart';
import './room-viewer.css';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export interface RoomViewerProps {
  setup: RoomSetupWithItems;
  onTrackEvent?: RoomAnalyticsHandler;
  className?: string;
}

export function RoomViewer({ setup, onTrackEvent, className = '' }: RoomViewerProps) {
  // Extract only product items for catalog & combo interactions
  const productItems = useMemo(
    () => setup.items.filter((item) => item.itemType === 'product'),
    [setup.items],
  );

  // Set of selected item IDs in the combo cart (default: all in-stock items are selected)
  const [selectedComboIds, setSelectedComboIds] = useState<Set<string>>(
    () => new Set(productItems.filter((i) => i.inStock !== false).map((i) => i.id)),
  );

  // Sync state between Stage hover/select and the product dock
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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

  return (
    <div className={`room-viewer-container ${className}`}>
      {/* 1. Core Tactile Setup Stage */}
      <div className="room-viewer-stage-wrapper">
        <RoomStage
          setup={setup}
          items={setup.items}
          mode="view"
          hoveredItemId={hoveredItemId}
          selectedItemId={selectedItemId}
          showHotspots={true}
          onItemHover={handleItemHover}
          onItemClick={handleItemClick}
          onSelectItem={(id) => setSelectedItemId(id)}
          onTrackEvent={onTrackEvent}
        />
        <div className="room-viewer-tip-bar">
          <span className="room-viewer-tip-icon">✦</span>
          <span>
            Di chuột hoặc chạm vào các thiết bị để xem thông số và giá bán thực tế.
          </span>
        </div>
      </div>

      {/* 2. Mobile & Touch Product Dock */}
      {productItems.length > 0 && (
        <section
          className="room-dock-section"
          aria-label="Danh sách thiết bị trong góc setup"
        >
          <div className="room-dock-header">
            <span className="room-dock-title">Thiết bị trong góc setup</span>
            <span className="room-dock-count">
              {productItems.length} sản phẩm
            </span>
          </div>

          <div className="room-dock-scroll">
            {productItems.map((item) => {
              const isItemActive =
                selectedItemId === item.id || hoveredItemId === item.id;
              const imgUrl =
                item.resolvedImageUrl ||
                item.customImageUrl ||
                item.product?.media?.[0]?.url ||
                '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png';

              return (
                <div
                  key={item.id}
                  className={`room-dock-card ${
                    isItemActive ? 'room-dock-card--active' : ''
                  }`}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setHoveredItemId(item.id);
                  }}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                >
                  <div className="room-dock-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={item.product?.name || item.label || 'Sản phẩm'}
                      className="room-dock-card-img"
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 640px) 64px, 80px"
                    />
                  </div>
                  <div className="room-dock-card-body">
                    <span className="room-dock-card-name">
                      {item.product?.name || item.label}
                    </span>
                    <div className="room-dock-card-footer">
                      <span className="room-dock-card-price">
                        {item.price ? `${formatVND(item.price)} ₫` : 'Liên hệ'}
                      </span>
                      <span
                        className={`room-combo-row-stock ${
                          item.inStock !== false
                            ? 'room-combo-row-stock--instock'
                            : 'room-combo-row-stock--out'
                        }`}
                      >
                        {item.inStock !== false ? 'Còn hàng' : 'Hết hàng'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
