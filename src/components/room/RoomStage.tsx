'use client';

import React, { useRef, useState, useCallback } from 'react';
import type { RoomItem } from '@/lib/room/types';
import type { RoomAnalyticsHandler } from '@/lib/room/analytics';
import './room-stage.css';

export interface RoomStageProps {
  setup: {
    title?: string;
    bgImageUrl: string;
    aspectRatio?: number;
  };
  items: RoomItem[];
  mode?: 'edit' | 'view';
  selectedItemId?: string | null;
  hoveredItemId?: string | null;
  showHotspots?: boolean;
  onSelectItem?: (id: string | null) => void;
  onUpdateItem?: (updatedItem: RoomItem) => void;
  onDeleteItem?: (id: string) => void;
  onItemClick?: (item: RoomItem) => void;
  onItemHover?: (item: RoomItem | null) => void;
  onTrackEvent?: RoomAnalyticsHandler;
  className?: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function RoomStage({
  setup,
  items,
  mode = 'view',
  selectedItemId = null,
  hoveredItemId = null,
  showHotspots = true,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onItemClick,
  onItemHover,
  className = '',
}: RoomStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [activeDrag, setActiveDrag] = useState<{
    pointerId: number;
    itemId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Resizing state
  const [activeResize, setActiveResize] = useState<{
    pointerId: number;
    itemId: string;
    startClientX: number;
    startWidth: number;
  } | null>(null);

  const aspectRatio = setup.aspectRatio && setup.aspectRatio > 0 ? setup.aspectRatio : 1.6;

  // Handle pointer down on item for moving
  const handleItemPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: RoomItem) => {
      if (mode !== 'edit') return;
      e.stopPropagation();
      onSelectItem?.(item.id);

      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      setActiveDrag({
        pointerId: e.pointerId,
        itemId: item.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: item.xPct,
        startY: item.yPct,
      });
    },
    [mode, onSelectItem],
  );

  // Handle pointer move on item (drag)
  const handleItemPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: RoomItem) => {
      if (!activeDrag || activeDrag.itemId !== item.id || activeDrag.pointerId !== e.pointerId) {
        return;
      }
      e.stopPropagation();

      const viewport = viewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const deltaX = e.clientX - activeDrag.startClientX;
      const deltaY = e.clientY - activeDrag.startClientY;

      const deltaXPct = (deltaX / rect.width) * 100;
      const deltaYPct = (deltaY / rect.height) * 100;

      const nextX = clamp(activeDrag.startX + deltaXPct, 0, 100);
      const nextY = clamp(activeDrag.startY + deltaYPct, 0, 100);

      onUpdateItem?.({
        ...item,
        xPct: Number(nextX.toFixed(1)),
        yPct: Number(nextY.toFixed(1)),
      });
    },
    [activeDrag, onUpdateItem],
  );

  // Handle pointer up on item
  const handleItemPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeDrag && activeDrag.pointerId === e.pointerId) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // pointer capture might already be released
        }
        setActiveDrag(null);
      }
    },
    [activeDrag],
  );

  // Handle pointer down on resize handle
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: RoomItem) => {
      e.stopPropagation();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      setActiveResize({
        pointerId: e.pointerId,
        itemId: item.id,
        startClientX: e.clientX,
        startWidth: item.widthPct,
      });
    },
    [],
  );

  // Handle pointer move on resize handle
  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: RoomItem) => {
      if (!activeResize || activeResize.itemId !== item.id || activeResize.pointerId !== e.pointerId) {
        return;
      }
      e.stopPropagation();

      const viewport = viewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      if (rect.width <= 0) return;

      const deltaX = e.clientX - activeResize.startClientX;
      const deltaWidthPct = (deltaX / rect.width) * 100;

      const nextWidth = clamp(activeResize.startWidth + deltaWidthPct, 4, 100);

      onUpdateItem?.({
        ...item,
        widthPct: Number(nextWidth.toFixed(1)),
      });
    },
    [activeResize, onUpdateItem],
  );

  // Handle pointer up on resize handle
  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeResize && activeResize.pointerId === e.pointerId) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        setActiveResize(null);
      }
    },
    [activeResize],
  );

  // Rotate item
  const handleRotate = useCallback(
    (item: RoomItem, deltaDeg: number) => {
      const nextRotation = (item.rotation + deltaDeg) % 360;
      onUpdateItem?.({
        ...item,
        rotation: nextRotation,
      });
    },
    [onUpdateItem],
  );

  // Flip horizontal
  const handleToggleFlip = useCallback(
    (item: RoomItem) => {
      onUpdateItem?.({
        ...item,
        flipX: !item.flipX,
      });
    },
    [onUpdateItem],
  );

  // Change Z-index
  const handleChangeZIndex = useCallback(
    (item: RoomItem, delta: number) => {
      const nextZ = Math.max(1, item.zIndex + delta);
      onUpdateItem?.({
        ...item,
        zIndex: nextZ,
      });
    },
    [onUpdateItem],
  );

  return (
    <div
      ref={viewportRef}
      className={`room-stage-viewport ${className}`}
      style={{ aspectRatio }}
      onClick={() => {
        if (mode === 'edit') {
          onSelectItem?.(null);
        }
      }}
    >
      {/* Background Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={setup.bgImageUrl}
        alt={setup.title || 'Ảnh nền góc setup'}
        className="room-stage-bg"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        sizes="(max-width: 1200px) 100vw, 1200px"
      />

      {/* Subtle guide grid for editor mode */}
      {mode === 'edit' && <div className="room-stage-overlay-grid" />}

      {/* Render Room Items */}
      {items.map((item) => {
        const isSelected = selectedItemId === item.id;
        const isHovered = hoveredItemId === item.id;
        const isDragging = activeDrag?.itemId === item.id;
        const imageUrl =
          (item.resolvedImageUrl && !item.resolvedImageUrl.toLowerCase().endsWith('.glb'))
            ? item.resolvedImageUrl
            : item.product?.media?.find((m) => m.kind === 'image')?.url ||
              (item.customImageUrl && !item.customImageUrl.toLowerCase().endsWith('.glb') ? item.customImageUrl : null) ||
              item.product?.media?.[0]?.url ||
              '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png';

        const itemClassNames = [
          'room-stage-item',
          mode === 'edit' ? 'room-stage-item--edit' : '',
          isDragging ? 'room-stage-item--dragging' : '',
          isSelected && mode === 'edit' ? 'room-stage-item--selected' : '',
          isSelected && mode === 'view' ? 'room-stage-item--view-selected' : '',
          isHovered ? 'room-stage-item--hovered' : '',
          mode === 'view' && item.itemType === 'product' ? 'room-stage-item--view-product' : '',
          mode === 'view' && item.itemType === 'decor' ? 'room-stage-item--view-decor' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            key={item.id}
            className={itemClassNames}
            style={{
              left: `${item.xPct}%`,
              top: `${item.yPct}%`,
              width: `${item.widthPct}%`,
              zIndex: isSelected ? 99 : item.zIndex,
              transform: `translate(-50%, -100%) rotate(${item.rotation || 0}deg) scaleX(${item.flipX ? -1 : 1})`,
            }}
            onPointerDown={(e) => handleItemPointerDown(e, item)}
            onPointerMove={(e) => handleItemPointerMove(e, item)}
            onPointerUp={handleItemPointerUp}
            onClick={(e) => {
              if (mode === 'view' && item.itemType === 'product') {
                e.stopPropagation();
                onItemClick?.(item);
                onSelectItem?.(item.id);
              }
            }}
            onPointerEnter={() => {
              if (mode === 'view' && item.itemType === 'product') {
                onItemHover?.(item);
              }
            }}
            onPointerLeave={() => {
              if (mode === 'view' && item.itemType === 'product') {
                onItemHover?.(null);
              }
            }}
          >
            {/* Item Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={item.label || item.product?.name || 'Vật phẩm góc setup'}
              className="room-stage-item-img"
              draggable={false}
              loading="lazy"
              decoding="async"
              sizes={`(max-width: 768px) ${Math.max(12, Math.round(item.widthPct * 1.5))}vw, ${Math.max(8, Math.round(item.widthPct))}vw`}
            />

            {/* View Mode Hotspot Pin */}
            {mode === 'view' && item.itemType === 'product' && showHotspots && (
              <div
                className="room-item-hotspot"
                style={{
                  transform: `translate(-50%, 50%) scaleX(${item.flipX ? -1 : 1})`,
                }}
              >
                <div className="room-item-hotspot-pulse" />
                <div className="room-item-hotspot-dot" />
              </div>
            )}

            {/* View Mode Interactive Hover Card */}
            {mode === 'view' && item.itemType === 'product' && (isHovered || isSelected) && (
              <div
                className={`room-item-hovercard ${item.yPct < 32 ? 'room-item-hovercard--bottom' : 'room-item-hovercard--top'}`}
                style={{
                  transform: `translateX(${item.xPct < 22 ? '0%' : item.xPct > 78 ? '-100%' : '-50%'}) scaleX(${item.flipX ? -1 : 1})`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="room-item-hovercard-inner">
                  <div className="room-item-hovercard-header">
                    <span className="room-item-hovercard-title">
                      {item.product?.name || item.label || 'Sản phẩm setup'}
                    </span>
                    <span
                      className={`room-item-hovercard-badge ${
                        item.inStock !== false
                          ? 'room-item-hovercard-badge--instock'
                          : 'room-item-hovercard-badge--out'
                      }`}
                    >
                      {item.inStock !== false ? 'Còn hàng' : 'Hết hàng'}
                    </span>
                  </div>
                  {item.variant?.name && (
                    <div className="room-item-hovercard-variant">
                      Phân loại: {item.variant.name}
                    </div>
                  )}
                  <div className="room-item-hovercard-footer">
                    <span className="room-item-hovercard-price">
                      {item.price
                        ? `${new Intl.NumberFormat('vi-VN').format(item.price)} ₫`
                        : 'Liên hệ'}
                    </span>
                    {item.product && (
                      <a
                        href={`/${item.product.categoryId}/${item.product.slug}`}
                        className="room-item-hovercard-cta"
                      >
                        Chi tiết →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Edit Mode Controls */}
            {mode === 'edit' && isSelected && (
              <>
                {/* Floating Toolbar */}
                <div
                  className="room-item-toolbar"
                  style={{
                    transform: `translateX(-50%) translateY(-8px) scaleX(${item.flipX ? -1 : 1})`,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="room-item-toolbar-label">
                    Lớp {item.zIndex} · {item.widthPct}%
                  </span>
                  <button
                    type="button"
                    className="room-item-toolbar-btn"
                    title="Lật ngang hình ảnh"
                    onClick={() => handleToggleFlip(item)}
                  >
                    Lật
                  </button>
                  <button
                    type="button"
                    className="room-item-toolbar-btn"
                    title="Xoay trái 15 độ"
                    onClick={() => handleRotate(item, -15)}
                  >
                    ↺ -15°
                  </button>
                  <button
                    type="button"
                    className="room-item-toolbar-btn"
                    title="Xoay phải 15 độ"
                    onClick={() => handleRotate(item, 15)}
                  >
                    ↻ +15°
                  </button>
                  <button
                    type="button"
                    className="room-item-toolbar-btn"
                    title="Tiến lên một lớp"
                    onClick={() => handleChangeZIndex(item, 1)}
                  >
                    ▲ Lên
                  </button>
                  <button
                    type="button"
                    className="room-item-toolbar-btn"
                    title="Lùi xuống một lớp"
                    onClick={() => handleChangeZIndex(item, -1)}
                  >
                    ▼ Xuống
                  </button>
                  <button
                    type="button"
                    className="room-item-toolbar-btn room-item-toolbar-btn--delete"
                    title="Xóa vật phẩm này"
                    onClick={() => onDeleteItem?.(item.id)}
                  >
                    ✕ Xóa
                  </button>
                </div>

                {/* Resize Handle */}
                <div
                  className="room-item-resize-handle"
                  title="Kéo để thay đổi kích thước"
                  onPointerDown={(e) => handleResizePointerDown(e, item)}
                  onPointerMove={(e) => handleResizePointerMove(e, item)}
                  onPointerUp={handleResizePointerUp}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
