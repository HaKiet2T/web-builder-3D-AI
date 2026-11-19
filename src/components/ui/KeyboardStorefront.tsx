'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product, Variant } from '@/lib/catalog/types';
import { useCartStore } from '@/store/cart';

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

interface KeyboardStorefrontProps {
  products: Product[];
}

const ITEM_HEIGHT = 380; // Distance between items in pixels (scaled for 2x hero cards)

export function KeyboardStorefront({ products }: KeyboardStorefrontProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [userSelectedVariantId, setUserSelectedVariantId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Smooth Physics & Wheel/Drag references
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const currentPosRef = useRef(0); // in pixels
  const targetPosRef = useRef(0); // in pixels
  const velocityRef = useRef(0);
  const isPointerDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startPointerYRef = useRef(0);
  const startPosRef = useRef(0);
  const lastSampleYRef = useRef(0);
  const lastSampleTimeRef = useRef(0);
  const activeIndexRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const hasMovedRef = useRef(false);
  const capturedPointerIdRef = useRef<number | null>(null);
  const justDraggedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const productCount = products.length;
  const currentProduct = products[activeIndex] ?? products[0];

  // Pick active variant (derived cleanly without cascading effects)
  const activeVariant: Variant | undefined =
    currentProduct?.variants.find((v) => v.id === userSelectedVariantId) ??
    currentProduct?.variants.find((v) => v.stockStatus !== 'out-of-stock') ??
    currentProduct?.variants[0];

  // Handle snapping & direct transformation update on each animation frame
  const applyTransforms = useCallback(
    (pos: number) => {
      if (!viewportRef.current) return;
      const viewportHeight = viewportRef.current.clientHeight || 650;
      const centerY = viewportHeight / 2;

      itemRefs.current.forEach((el, index) => {
        if (!el) return;
        // Position of this item center relative to viewport top
        const itemCenter = centerY + index * ITEM_HEIGHT - pos;
        const distFromCenter = itemCenter - centerY;
        const absDist = Math.abs(distFromCenter);

        // Proximity factor: 1.0 at center, drops to 0.0 at distance >= (viewportHeight * 0.52)
        const maxDist = Math.max(viewportHeight * 0.52, 1);
        const proximity = Math.max(0, 1 - absDist / maxDist);

        // Smooth zoom: 1.18 at center, 0.74 at far edges
        const scale = (0.74 + 0.44 * proximity).toFixed(3);
        // Opacity: 1.0 at center, 0.36 at far edges
        const opacity = (0.36 + 0.64 * proximity).toFixed(3);
        // 3D tilt: subtle rotateX up to 22deg
        const tilt = Math.max(-22, Math.min(22, -(distFromCenter / maxDist) * 22)).toFixed(2);
        // Z-Index: higher near center
        const zIndex = Math.round(10 + proximity * 40);

        // Write directly to CSS variables on DOM element for guaranteed 60-120 FPS
        el.style.setProperty('--kb-y', `${(index * ITEM_HEIGHT - pos).toFixed(1)}px`);
        el.style.setProperty('--kb-scale', scale);
        el.style.setProperty('--kb-opacity', opacity);
        el.style.setProperty('--kb-tilt', `${tilt}deg`);
        el.style.zIndex = String(zIndex);

        if (proximity > 0.82) {
          el.setAttribute('data-focused', 'true');
        } else {
          el.removeAttribute('data-focused');
        }
      });
    },
    []
  );

  // Physics animation loop
  useEffect(() => {
    let running = true;

    // Run first frame immediately to calibrate layout
    applyTransforms(currentPosRef.current);

    const tick = () => {
      if (!running) return;

      if (!isDraggingRef.current) {
        // Apply inertia when not dragging
        if (Math.abs(velocityRef.current) > 0.15) {
          targetPosRef.current += velocityRef.current;
          velocityRef.current *= 0.91; // Damping
        } else {
          velocityRef.current = 0;
          // Snap to closest item index
          const closestIndex = Math.max(
            0,
            Math.min(productCount - 1, Math.round(targetPosRef.current / ITEM_HEIGHT))
          );
          const snapTarget = closestIndex * ITEM_HEIGHT;
          // Smooth spring to snap target
          targetPosRef.current += (snapTarget - targetPosRef.current) * 0.12;
        }

        // Clamp target range with gentle rubber-band boundary
        const maxPos = Math.max(0, (productCount - 1) * ITEM_HEIGHT);
        if (targetPosRef.current < 0) {
          targetPosRef.current *= 0.8;
        } else if (targetPosRef.current > maxPos) {
          targetPosRef.current = maxPos + (targetPosRef.current - maxPos) * 0.8;
        }
      }

      // Smooth interpolation of currentPos towards targetPos
      const diff = targetPosRef.current - currentPosRef.current;
      currentPosRef.current += diff * 0.16;

      // Update transforms
      applyTransforms(currentPosRef.current);

      // Check nearest active item
      const nearestIdx = Math.max(
        0,
        Math.min(productCount - 1, Math.round(currentPosRef.current / ITEM_HEIGHT))
      );

      if (nearestIdx !== activeIndexRef.current) {
        activeIndexRef.current = nearestIdx;
        setActiveIndex(nearestIdx);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [productCount, applyTransforms]);

  // Jump smoothly to a specific item index
  const scrollToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(productCount - 1, index));
    targetPosRef.current = clamped * ITEM_HEIGHT;
    velocityRef.current = 0;
  }, [productCount]);

  // Wheel event listener on viewport
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Accumulate velocity based on scroll direction
      const delta = e.deltaY;
      velocityRef.current += Math.max(-50, Math.min(50, delta * 0.35));
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, []);

  // Keyboard navigation (Arrow Up / Down)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(activeIndexRef.current - 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToIndex(activeIndexRef.current + 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scrollToIndex]);

  // Pointer drag handling - resilient threshold to differentiate intentional drag from click
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Main button only
    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    hasMovedRef.current = false;
    startPointerYRef.current = e.clientY;
    startPosRef.current = targetPosRef.current;
    lastSampleYRef.current = e.clientY;
    lastSampleTimeRef.current = performance.now();
    velocityRef.current = 0;
    capturedPointerIdRef.current = null;
    // Note: We do NOT call setPointerCapture here immediately so that child
    // links and images receive clean click events when the user clicks without dragging.
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const now = performance.now();
    const deltaY = startPointerYRef.current - e.clientY;

    // Movement must exceed 10px to be recognized as an intentional drag
    if (Math.abs(deltaY) > 10) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        hasMovedRef.current = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          capturedPointerIdRef.current = e.pointerId;
        } catch {
          // Ignore capture errors
        }
      }
    }

    if (!isDraggingRef.current) return;

    targetPosRef.current = startPosRef.current + deltaY;

    // Track instantaneous release velocity
    const dt = now - lastSampleTimeRef.current;
    if (dt > 12) {
      const dy = lastSampleYRef.current - e.clientY;
      velocityRef.current = (dy / dt) * 16;
      lastSampleYRef.current = e.clientY;
      lastSampleTimeRef.current = now;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    if (capturedPointerIdRef.current !== null) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(capturedPointerIdRef.current);
      } catch {
        // Ignore capture release errors
      }
      capturedPointerIdRef.current = null;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      // Suppress synthetic clicks immediately following drag release
      if (justDraggedTimeoutRef.current) clearTimeout(justDraggedTimeoutRef.current);
      justDraggedTimeoutRef.current = setTimeout(() => {
        hasMovedRef.current = false;
      }, 80);
    } else {
      hasMovedRef.current = false;
    }
  };

  // Direct product navigation handler when clicking the artwork image
  const handleArtworkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    productSlug: string
  ) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Allow user to open in new tab with middle-click or modifiers
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
      return;
    }

    // Direct client-side transition
    e.preventDefault();
    e.stopPropagation();
    router.push(`/keyboard/${productSlug}`);
  };

  // Add to cart handler
  const handleAddToCart = () => {
    if (!currentProduct || !activeVariant) return;
    setIsAdding(true);

    const cover = currentProduct.media.find((m) => m.kind === 'image');
    useCartStore.getState().addItem({
      productId: currentProduct.id,
      variantId: activeVariant.id,
      name: currentProduct.name,
      variantName: activeVariant.name,
      imageUrl: cover?.url ?? null,
      unitPrice: activeVariant.price,
      quantity: 1,
      stockStatus: activeVariant.stockStatus,
    });

    useCartStore.getState().openCart();
    setAddedSuccess(true);
    setTimeout(() => {
      setIsAdding(false);
      setAddedSuccess(false);
    }, 1200);
  };

  if (!products.length) {
    return (
      <main className="home-main">
        <div className="page-empty">
          <p>Hiện chưa có mẫu bàn phím cơ nào.</p>
          <Link className="page-back-link" href="/">
            ← Quay lại trang chủ
          </Link>
        </div>
      </main>
    );
  }

  const discountPercent =
    activeVariant?.compareAtPrice && activeVariant.compareAtPrice > activeVariant.price
      ? Math.round(
          ((activeVariant.compareAtPrice - activeVariant.price) / activeVariant.compareAtPrice) * 100
        )
      : null;

  return (
    <div
      className="keyboard-storefront-wrapper"
      style={{
        width: '100%',
        minHeight: 'calc(100vh - 78px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <main
        className="keyboard-storefront-main"
        aria-label="Bộ sưu tập bàn phím cơ"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          width: '100%',
          height: 'calc(100vh - 78px)',
          maxWidth: 1540,
          margin: '0 auto',
        }}
      >
        {/* Left Column: Product Information */}
        <section
          className="keyboard-info-column"
          aria-labelledby="active-keyboard-heading"
          style={{
            flex: '0 0 460px',
            width: 460,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Pinned Fixed Top Header: Breadcrumb & Collection Tag */}
          <header
            className="keyboard-pinned-header"
            style={{
              flexShrink: 0,
              width: '100%',
              padding: '16px 0 14px 0',
              background: 'var(--page)',
              borderBottom: '1px solid var(--line)',
              zIndex: 20,
            }}
          >
            <div className="keyboard-top-meta">
              <Link className="keyboard-back-link" href="/">
                ← Tất cả thiết bị
              </Link>
              <span className="keyboard-collection-badge">
                Bộ sưu tập Bàn phím cơ
              </span>
            </div>
          </header>

          {/* Scrollable Information Body */}
          <div
            className="keyboard-info-scroll-body"
            style={{
              flex: 1,
              overflowY: 'auto',
              paddingTop: 20,
              paddingRight: 6,
              paddingBottom: 28,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Brand & Live Counter */}
          <div className="keyboard-brand-row">
            <span className="keyboard-brand-tag">{currentProduct.brand}</span>
            <div className="keyboard-counter-group" aria-label="Điều hướng sản phẩm">
              <span className="keyboard-counter-text">
                <strong>{String(activeIndex + 1).padStart(2, '0')}</strong> /{' '}
                {String(productCount).padStart(2, '0')}
              </span>
              <div className="keyboard-arrow-buttons">
                <button
                  type="button"
                  className="keyboard-nav-btn"
                  onClick={() => scrollToIndex(activeIndex - 1)}
                  disabled={activeIndex === 0}
                  aria-label="Bàn phím trước"
                  title="Bàn phím trước"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="keyboard-nav-btn"
                  onClick={() => scrollToIndex(activeIndex + 1)}
                  disabled={activeIndex === productCount - 1}
                  aria-label="Bàn phím tiếp theo"
                  title="Bàn phím tiếp theo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Heading & Summary */}
          <h1 id="active-keyboard-heading" className="keyboard-title">
            {currentProduct.name}
          </h1>
          <p className="keyboard-summary">{currentProduct.summary}</p>

          {/* Pricing & Stock Banner */}
          <div className="keyboard-pricing-card">
            <div className="keyboard-price-row">
              <span className="keyboard-price">
                {formatPrice(activeVariant?.price ?? 0)}
              </span>
              {activeVariant?.compareAtPrice ? (
                <span className="keyboard-compare-price">
                  {formatPrice(activeVariant.compareAtPrice)}
                </span>
              ) : null}
              {discountPercent ? (
                <span className="keyboard-discount-pill">-{discountPercent}%</span>
              ) : null}
            </div>

            <div className="keyboard-stock-indicator">
              <span
                className={`keyboard-stock-dot ${
                  activeVariant?.stockStatus === 'out-of-stock' ? 'out' : 'in'
                }`}
              />
              <span className="keyboard-stock-label">
                {activeVariant?.stockStatus === 'out-of-stock'
                  ? 'Hết hàng tạm thời'
                  : `Còn hàng (${activeVariant?.stockQuantity ?? 10} chiếc sẵn sàng)`}
              </span>
            </div>
          </div>

          {/* Key Highlights */}
          {currentProduct.highlights?.length ? (
            <div className="keyboard-highlights-block">
              <h2 className="keyboard-block-title">Đặc tính nổi bật</h2>
              <ul className="keyboard-highlights-list">
                {currentProduct.highlights.map((highlight, idx) => (
                  <li key={idx} className="keyboard-highlight-pill">
                    <svg
                      className="keyboard-check-icon"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Switch & Variant Selector */}
          {currentProduct.variants.length > 1 ? (
            <div className="keyboard-variants-block">
              <h2 className="keyboard-block-title">Lựa chọn Switch</h2>
              <div className="keyboard-variant-pills" role="radiogroup" aria-label="Loại switch">
                {currentProduct.variants.map((v) => {
                  const isSelected = v.id === activeVariant?.id;
                  const isOutOfStock = v.stockStatus === 'out-of-stock';
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={isOutOfStock}
                      onClick={() => setUserSelectedVariantId(v.id)}
                      className={`keyboard-variant-pill ${isSelected ? 'selected' : ''} ${
                        isOutOfStock ? 'disabled' : ''
                      }`}
                    >
                      <span className="keyboard-variant-name">{v.name}</span>
                      <span className="keyboard-variant-price">{formatPrice(v.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Action CTAs */}
          <div className="keyboard-actions-row">
            <button
              type="button"
              className={`keyboard-add-cart-btn ${addedSuccess ? 'success' : ''}`}
              onClick={handleAddToCart}
              disabled={isAdding || activeVariant?.stockStatus === 'out-of-stock'}
            >
              {addedSuccess ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>Đã thêm vào giỏ!</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  <span>Thêm vào giỏ hàng</span>
                </>
              )}
            </button>

            <Link
              href={`/keyboard/${currentProduct.slug}`}
              className="keyboard-view-details-btn"
            >
              Chi tiết thông số
            </Link>
          </div>

          {/* Service Commitments & Trust Badges */}
          <div className="keyboard-trust-row" aria-label="Cam kết dịch vụ">
            <div className="keyboard-trust-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="keyboard-trust-icon"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Chính hãng 100%</span>
            </div>
            <div className="keyboard-trust-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="keyboard-trust-icon"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Đổi mới 30 ngày</span>
            </div>
            <div className="keyboard-trust-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="keyboard-trust-icon"
              >
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span>Giao hàng toàn quốc</span>
            </div>
          </div>
        </div>
      </section>

        {/* Right Column: Vertical Sliding Rail with Zoom-at-Center */}
        <section
          className="keyboard-rail-column"
          aria-label="Danh sách trượt bàn phím"
          style={{
            flex: 1,
            position: 'relative',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Tactile Center Target Guides */}
          <div className="keyboard-rail-target-guide" aria-hidden="true" />

          {/* Viewport Area */}
          <div
            ref={viewportRef}
            className="keyboard-rail-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              ref={trackRef}
              className="keyboard-rail-track"
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                width: '100%',
                height: 0,
              }}
            >
              {products.map((product, idx) => {
                const itemCover = product.media.find((m) => m.kind === 'image');
                const isActive = idx === activeIndex;

                return (
                  <div
                    key={product.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    className={`keyboard-rail-card ${isActive ? 'active-slot' : ''}`}
                    onClick={() => {
                      if (!hasMovedRef.current) {
                        scrollToIndex(idx);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Chọn bàn phím ${product.name}`}
                    style={
                      {
                        '--kb-y': `${idx * ITEM_HEIGHT}px`,
                        '--kb-scale': idx === 0 ? '1.18' : '0.74',
                        '--kb-opacity': idx === 0 ? '1.0' : '0.36',
                        '--kb-tilt': '0deg',
                      } as React.CSSProperties
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        scrollToIndex(idx);
                      }
                    }}
                  >
                    <div className="keyboard-card-inner">
                      {/* Product Artwork Link to Product Detail Page */}
                      <div className="keyboard-artwork-wrap">
                        <Link
                          href={`/keyboard/${product.slug}`}
                          className="keyboard-artwork-link"
                          onClick={(e) => handleArtworkClick(e, product.slug)}
                          aria-label={`Xem chi tiết sản phẩm ${product.name}`}
                          title={`Xem chi tiết sản phẩm ${product.name}`}
                          draggable={false}
                        >
                          {itemCover?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={itemCover.url}
                              alt={product.name}
                              className="keyboard-artwork-img"
                              loading={idx <= 2 ? 'eager' : 'lazy'}
                              decoding="async"
                              draggable={false}
                              style={{
                                maxWidth: '96%',
                                maxHeight: 420,
                                objectFit: 'contain',
                                cursor: 'pointer',
                              }}
                            />
                          ) : (
                            <div className="keyboard-artwork-fallback" style={{ cursor: 'pointer' }}>
                              <svg
                                width="180"
                                height="66"
                                viewBox="0 0 120 44"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <rect x="2" y="2" width="116" height="40" rx="6" />
                                <rect x="8" y="8" width="10" height="10" rx="2" />
                                <rect x="22" y="8" width="10" height="10" rx="2" />
                                <rect x="36" y="8" width="10" height="10" rx="2" />
                                <rect x="50" y="8" width="10" height="10" rx="2" />
                                <rect x="64" y="8" width="10" height="10" rx="2" />
                                <rect x="78" y="8" width="10" height="10" rx="2" />
                                <rect x="92" y="8" width="20" height="10" rx="2" />
                                <rect x="8" y="22" width="14" height="14" rx="2" />
                                <rect x="26" y="22" width="68" height="14" rx="2" />
                                <rect x="98" y="22" width="14" height="14" rx="2" />
                              </svg>
                              <span>{product.brand}</span>
                            </div>
                          )}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Item Selector Dots at Rail Right edge */}
          <div className="keyboard-rail-dots" aria-hidden="true">
            {products.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                className={`keyboard-dot-nav ${dotIdx === activeIndex ? 'active' : ''}`}
                onClick={() => scrollToIndex(dotIdx)}
                aria-label={`Chuyển tới mẫu ${dotIdx + 1}`}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
