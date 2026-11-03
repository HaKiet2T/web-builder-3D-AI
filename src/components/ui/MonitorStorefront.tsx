'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { MonitorProduct } from '@/data/monitors';

type ViewState = 'gallery' | 'moving' | 'details' | 'returning';

interface MonitorStorefrontProps {
  products: MonitorProduct[];
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startRotation: number;
  moved: boolean;
  samples: Array<{ x: number; time: number }>;
}

const FULL_TURN = Math.PI * 2;
const ORBIT_FOCUS_ANGLE = Math.atan2(-0.8, -0.45);
const DRAG_RADIANS_PER_PIXEL = 0.003;
const INERTIA_DURATION_MS = 420;
const MAX_INERTIA_RADIANS = 0.5;
const DETAIL_TRANSITION_MS = 700;
const AUTO_ROTATION_MS = 3600;

function wrapAngle(angle: number) {
  return ((angle + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI;
}

function orbitStyle(angle: number, productCount: number): CSSProperties {
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  const itemDensity = Math.min(1, 6 / Math.max(productCount, 1));
  const wideDistance = Math.hypot(cosine + 0.45, sine + 0.8);
  const wideProximity = 1 - Math.min(wideDistance / 2, 1);
  const mobileDistance = Math.hypot(cosine, sine + 0.55);
  const mobileProximity = 1 - Math.min(mobileDistance / 2, 1);

  return {
    '--orbit-x-wide': (cosine * 32).toFixed(3) + 'vw',
    '--orbit-y-wide': (sine * 34).toFixed(3) + 'svh',
    '--orbit-x-mobile': (cosine * 31).toFixed(3) + 'vw',
    '--orbit-y-mobile': (sine * 17).toFixed(3) + 'svh',
    '--orbit-item-density': itemDensity.toFixed(3),
    '--orbit-scale-wide': (0.54 + 0.7 * wideProximity).toFixed(3),
    '--orbit-scale-mobile': (0.54 + 0.65 * mobileProximity).toFixed(3),
    '--orbit-opacity': (0.58 + 0.42 * wideProximity).toFixed(3),
    '--orbit-opacity-mobile': (0.58 + 0.42 * mobileProximity).toFixed(3),
    '--orbit-depth': String(Math.round(20 + wideProximity * 40)),
    '--orbit-depth-mobile': String(Math.round(20 + mobileProximity * 40)),
  } as CSSProperties;
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="monitor-arrow-icon">
      <path
        d={direction === 'left' ? 'M19 12H5m0 0 6 6m-6-6 6-6' : 'M5 12h14m0 0-6-6m6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: 'light' | 'dark' }) {
  if (theme === 'light') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="monitor-theme-icon">
        <circle cx="12" cy="12" r="3.7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 2.5v2m0 15v2m9.5-9.5h-2m-15 0h-2m16.22-6.72-1.42 1.42M6.7 17.3l-1.42 1.42m13.44 0-1.42-1.42M6.7 6.7 5.28 5.28"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="monitor-theme-icon">
      <path
        d="M19.8 15.2A8.1 8.1 0 0 1 8.8 4.2 8.2 8.2 0 1 0 19.8 15.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MonitorStorefront({ products }: MonitorStorefrontProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeReady, setThemeReady] = useState(false);
  const [rotation, setRotation] = useState(ORBIT_FOCUS_ANGLE);
  const [view, setView] = useState<ViewState>('gallery');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isInertial, setIsInertial] = useState(false);
  const rotationRef = useRef(ORBIT_FOCUS_ANGLE);
  const dragRef = useRef<DragState | null>(null);
  const autoRotationFrameRef = useRef<number | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const autoRotationStartedRef = useRef(false);
  const autoRotationActiveRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const restoreFocusAfterReturnRef = useRef(false);

  const updateRotation = useCallback((nextRotation: number) => {
    rotationRef.current = nextRotation;
    setRotation(nextRotation);
  }, []);

  const stopInertia = useCallback(() => {
    if (inertiaFrameRef.current !== null) {
      window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
    setIsInertial(false);
  }, []);

  const stopAutoRotation = useCallback(() => {
    autoRotationStartedRef.current = true;
    if (autoRotationFrameRef.current !== null) {
      window.cancelAnimationFrame(autoRotationFrameRef.current);
      autoRotationFrameRef.current = null;
    }

    if (autoRotationActiveRef.current) {
      autoRotationActiveRef.current = false;
      setIsAutoRotating(false);
    }
  }, []);

  const activeIndex = useMemo(() => {
    if (products.length === 0) return -1;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    products.forEach((product, index) => {
      const angle = rotation + (index * FULL_TURN) / products.length;
      const distance = Math.abs(wrapAngle(angle - ORBIT_FOCUS_ANGLE));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }, [products, rotation]);

  const activeProduct = activeIndex >= 0 ? products[activeIndex] : null;
  const detailIndex = products.findIndex((product) => product.id === detailId);
  const detailProduct = detailIndex >= 0 ? products[detailIndex] : null;
  const rotationDegrees = ((Math.round((rotation * 180) / Math.PI) % 360) + 360) % 360;
  const hasDetail = view !== 'gallery' && detailProduct !== null;

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(motionQuery.matches);
    updateMotionPreference();
    motionQuery.addEventListener('change', updateMotionPreference);

    const frame = window.requestAnimationFrame(() => {
      try {
        const savedTheme = window.localStorage.getItem('monitor-storefront-theme');
        if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
      } catch {
        // Keep the default light theme when storage is unavailable.
      }
      setThemeReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      motionQuery.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    try {
      window.localStorage.setItem('monitor-storefront-theme', theme);
    } catch {
      // Theme selection still works for the current session.
    }
  }, [theme, themeReady]);

  useEffect(() => {
    if (autoRotationStartedRef.current) return;

    let startFrame: number | null = window.requestAnimationFrame(() => {
      if (autoRotationStartedRef.current) return;
      autoRotationStartedRef.current = true;
      if (
        reducedMotion ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        products.length < 2
      ) {
        return;
      }

      const startRotation = rotationRef.current;
      let startTime: number | null = null;
      autoRotationActiveRef.current = true;
      setIsAutoRotating(true);

      const animate = (time: number) => {
        if (!autoRotationActiveRef.current) return;
        if (startTime === null) startTime = time;

        const progress = Math.min((time - startTime) / AUTO_ROTATION_MS, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        updateRotation(startRotation + Math.PI * easedProgress);

        if (progress < 1) {
          autoRotationFrameRef.current = window.requestAnimationFrame(animate);
        } else {
          autoRotationFrameRef.current = null;
          autoRotationActiveRef.current = false;
          setIsAutoRotating(false);
        }
      };

      autoRotationFrameRef.current = window.requestAnimationFrame(animate);
    });

    return () => {
      if (startFrame !== null) window.cancelAnimationFrame(startFrame);
      startFrame = null;
      if (autoRotationFrameRef.current !== null) {
        window.cancelAnimationFrame(autoRotationFrameRef.current);
        autoRotationFrameRef.current = null;
      }
      if (autoRotationActiveRef.current) {
        autoRotationActiveRef.current = false;
        setIsAutoRotating(false);
      }
    };
  }, [products.length, reducedMotion, updateRotation]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      const now = performance.now();
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (!drag.moved && distance < 6) return;

      drag.moved = true;
      drag.samples = drag.samples.filter((sample) => now - sample.time <= 120);
      drag.samples.push({ x: event.clientX, time: now });
      const dragDistance = event.clientX - drag.startX;
      updateRotation(drag.startRotation + dragDistance * DRAG_RADIANS_PER_PIXEL);
    };

    const finishDrag = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      const now = performance.now();
      if (drag.moved) suppressClickUntilRef.current = performance.now() + 260;
      if (drag.moved && event.type === 'pointerup' && !reducedMotion) {
        drag.samples = drag.samples.filter((sample) => now - sample.time <= 120);
        drag.samples.push({ x: event.clientX, time: now });
        const firstSample = drag.samples[0];
        const lastSample = drag.samples[drag.samples.length - 1];
        const elapsed = lastSample.time - firstSample.time;
        if (elapsed > 0) {
          const velocityX = (lastSample.x - firstSample.x) / elapsed;
          const inertiaDistance = Math.max(
            -MAX_INERTIA_RADIANS,
            Math.min(
              MAX_INERTIA_RADIANS,
              velocityX * DRAG_RADIANS_PER_PIXEL * INERTIA_DURATION_MS * 0.4,
            ),
          );
          if (Math.abs(inertiaDistance) > 0.015) {
            const startRotation = rotationRef.current;
            let startTime: number | null = null;
            setIsInertial(true);
            const animateInertia = (time: number) => {
              if (startTime === null) startTime = time;
              const progress = Math.min((time - startTime) / INERTIA_DURATION_MS, 1);
              const easedProgress = 1 - Math.pow(1 - progress, 3);
              updateRotation(startRotation + inertiaDistance * easedProgress);

              if (progress < 1) {
                inertiaFrameRef.current = window.requestAnimationFrame(animateInertia);
              } else {
                inertiaFrameRef.current = null;
                setIsInertial(false);
              }
            };
            inertiaFrameRef.current = window.requestAnimationFrame(animateInertia);
          }
        }
      }

      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
      if (inertiaFrameRef.current !== null) {
        window.cancelAnimationFrame(inertiaFrameRef.current);
        inertiaFrameRef.current = null;
        setIsInertial(false);
      }
    };
  }, [reducedMotion, updateRotation]);

  useEffect(() => {
    if (view === 'moving') {
      const timer = window.setTimeout(() => setView('details'), reducedMotion ? 0 : DETAIL_TRANSITION_MS);
      return () => window.clearTimeout(timer);
    }

    if (view === 'returning') {
      const timer = window.setTimeout(
        () => {
          setView('gallery');
          setDetailId(null);
          restoreFocusAfterReturnRef.current = true;
        },
        reducedMotion ? 0 : DETAIL_TRANSITION_MS,
      );
      return () => window.clearTimeout(timer);
    }

    return;
  }, [reducedMotion, view]);

  useEffect(() => {
    if (view !== 'details') return;
    const frame = window.requestAnimationFrame(() => detailHeadingRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [detailId, view]);

  useEffect(() => {
    if (view !== 'gallery' || !restoreFocusAfterReturnRef.current) return;
    restoreFocusAfterReturnRef.current = false;
    triggerRef.current?.focus();
  }, [view]);

  const rotateToIndex = useCallback(
    (index: number) => {
      if (products.length < 2) return;
      stopInertia();
      stopAutoRotation();
      const target = ORBIT_FOCUS_ANGLE - (index * FULL_TURN) / products.length;
      updateRotation(rotationRef.current + wrapAngle(target - rotationRef.current));
    },
    [products.length, stopAutoRotation, stopInertia, updateRotation],
  );

  const moveGallery = useCallback(
    (step: number) => {
      if (products.length < 2 || activeIndex < 0) return;
      const nextIndex = (activeIndex + step + products.length) % products.length;
      rotateToIndex(nextIndex);
    },
    [activeIndex, products.length, rotateToIndex],
  );

  const openDetails = (product: MonitorProduct, trigger: HTMLElement) => {
    if (performance.now() < suppressClickUntilRef.current) return;
    stopInertia();
    stopAutoRotation();
    triggerRef.current = trigger;
    setDetailId(product.id);
    setView(reducedMotion ? 'details' : 'moving');
  };

  const closeDetails = useCallback(() => {
    if (detailId) setView('returning');
  }, [detailId]);

  const moveDetail = useCallback(
    (step: number) => {
      if (detailIndex < 0 || products.length < 2) return;
      const nextIndex = (detailIndex + step + products.length) % products.length;
      setDetailId(products[nextIndex].id);
      setView(reducedMotion ? 'details' : 'moving');
    },
    [detailIndex, products, reducedMotion],
  );

  useEffect(() => {
    if (!hasDetail) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetails();
      if (view === 'details' && event.key === 'ArrowLeft') moveDetail(-1);
      if (view === 'details' && event.key === 'ArrowRight') moveDetail(1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDetails, hasDetail, moveDetail, view]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (view !== 'gallery' || (event.button !== 0 && event.pointerType === 'mouse')) return;
    if (event.target instanceof Element && event.target.closest('[data-orbit-control]')) return;

    stopInertia();
    stopAutoRotation();
    const now = performance.now();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotationRef.current,
      moved: false,
      samples: [{ x: event.clientX, time: now }],
    };
    setIsDragging(true);
  };

  const handleRangeChange = (value: number) => {
    stopInertia();
    stopAutoRotation();
    updateRotation((value * Math.PI) / 180);
  };

  return (
    <main
      className="monitor-storefront"
      data-theme={theme}
      data-view={view}
      data-dragging={isDragging}
      data-rotating={isAutoRotating}
      data-inertial={isInertial}
    >
      <header className="monitor-header">
        <a className="monitor-brand" href="#collection" aria-label="ASUS Republic of Gamers, về bộ sưu tập">
          <span className="monitor-brand-name">ASUS</span>
          <span className="monitor-brand-rule" aria-hidden="true" />
          <span className="monitor-brand-meta">Republic of Gamers</span>
        </a>
        <div className="monitor-header-actions">
          <span className="monitor-header-label">Bộ sưu tập màn hình</span>
          <button
            className="monitor-theme-toggle"
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
            aria-pressed={theme === 'dark'}
            title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
          >
            <ThemeIcon theme={theme} />
            <span>{theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}</span>
          </button>
        </div>
      </header>

      <section
        className="monitor-experience"
        id="collection"
        aria-label="Bộ sưu tập màn hình ASUS ROG"
        onPointerDown={handlePointerDown}
      >
        <div className="monitor-copy" data-orbit-control aria-hidden={hasDetail} inert={hasDetail}>
          <p className="monitor-count">
            {String(Math.max(activeIndex + 1, 1)).padStart(2, '0')} / {String(products.length).padStart(2, '0')}
          </p>
          <h1>Màn hình ROG</h1>
          <p className="monitor-intro">Khám phá bộ sưu tập màn hình gaming ASUS ROG.</p>

          {activeProduct ? (
            <div className="monitor-active-product">
              <span className="monitor-category">{activeProduct.category}</span>
              <p className="monitor-active-name">{activeProduct.name}</p>
              <button
                className="monitor-text-button"
                type="button"
                onClick={(event) => openDetails(activeProduct, event.currentTarget)}
                disabled={hasDetail}
              >
                Xem thông tin <span aria-hidden="true">↗</span>
              </button>
            </div>
          ) : (
            <p className="monitor-intro">Chưa có màn hình để hiển thị.</p>
          )}
        </div>

        <div
          className="monitor-product-stage"
          role="group"
          aria-label="Kéo theo vòng tròn để xoay bộ sưu tập"
          aria-hidden={hasDetail}
          inert={hasDetail}
        >
          {products.map((product, index) => {
            const angle = rotation + (index * FULL_TURN) / products.length;
            const isFocused = detailId === product.id && (view === 'moving' || view === 'details');

            return (
              <button
                key={product.id}
                className="monitor-orbit-item"
                style={orbitStyle(angle, products.length)}
                data-active={activeIndex === index}
                data-focused={isFocused}
                data-product-trigger
                type="button"
                aria-label={'Xem chi tiết ' + product.name}
                aria-current={activeIndex === index ? 'true' : undefined}
                onClick={(event) => openDetails(product, event.currentTarget)}
              >
                <span className="monitor-product-arrival" style={{ animationDelay: index * 65 + 'ms' }}>
                  <span className="monitor-product-art">
                    <Image
                      src={product.image}
                      alt=""
                      fill
                      draggable={false}
                      sizes="(max-width: 720px) 68vw, 24vw"
                      preload={index === 0}
                      loading={index === 0 ? undefined : 'lazy'}
                      className="monitor-product-image"
                    />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="monitor-wheel"
          data-orbit-control
          aria-label="Điều khiển vòng sản phẩm"
          aria-hidden={hasDetail}
          inert={hasDetail}
        >
          <button
            className="monitor-wheel-button"
            type="button"
            onClick={() => moveGallery(-1)}
            aria-label="Xoay đến màn hình trước"
            disabled={products.length < 2 || hasDetail}
          >
            <ArrowIcon direction="left" />
          </button>
          <label className="monitor-wheel-slider">
            <span className="sr-only">Xoay bộ sưu tập màn hình</span>
            <input
              type="range"
              min="0"
              max="359"
              step="1"
              value={rotationDegrees}
              onChange={(event) => handleRangeChange(Number(event.currentTarget.value))}
              aria-valuetext={'Màn hình ' + String(Math.max(activeIndex + 1, 1)) + ' trên ' + String(products.length)}
              disabled={products.length < 2 || hasDetail}
            />
            <span className="monitor-wheel-hint" aria-hidden="true">Kéo để xoay</span>
          </label>
          <button
            className="monitor-wheel-button"
            type="button"
            onClick={() => moveGallery(1)}
            aria-label="Xoay đến màn hình tiếp theo"
            disabled={products.length < 2 || hasDetail}
          >
            <ArrowIcon direction="right" />
          </button>
          <span className="monitor-wheel-index" aria-hidden="true">
            {String(Math.max(activeIndex + 1, 1)).padStart(2, '0')} / {String(products.length).padStart(2, '0')}
          </span>
        </div>

        {detailProduct && (
          <section
            className="monitor-detail-panel"
            aria-labelledby="monitor-detail-heading"
            aria-hidden={view !== 'details'}
            inert={view !== 'details'}
            data-visible={view === 'details'}
          >
            <div className="monitor-detail-content">
              <div className="monitor-detail-topline">
                <span className="monitor-category">{detailProduct.category}</span>
                <button
                  className="monitor-back-button"
                  type="button"
                  onClick={closeDetails}
                  aria-label="Quay lại bộ sưu tập"
                >
                  <ArrowIcon direction="left" />
                  <span>Quay lại bộ sưu tập</span>
                </button>
              </div>
              <h2 id="monitor-detail-heading" ref={detailHeadingRef} tabIndex={-1}>
                {detailProduct.name}
              </h2>
              <p className="monitor-detail-description">
                Thông tin nổi bật của mẫu màn hình trong bộ sưu tập ASUS ROG.
              </p>

              <div className="monitor-specifications">
                <h3>Thông số nổi bật</h3>
                <ul>
                  {detailProduct.specs.map((spec) => (
                    <li key={spec}>{spec}</li>
                  ))}
                </ul>
              </div>

              <a className="monitor-source-link" href={detailProduct.sourceUrl} target="_blank" rel="noreferrer">
                Thông số chính thức từ ASUS
                <span aria-hidden="true">↗</span>
                <span className="sr-only">, mở trong thẻ mới</span>
              </a>

              <div className="monitor-detail-navigation" aria-label="Chuyển mẫu màn hình">
                <button type="button" onClick={() => moveDetail(-1)} aria-label="Mẫu màn hình trước">
                  <ArrowIcon direction="left" />
                </button>
                <span>{String(detailIndex + 1).padStart(2, '0')} / {String(products.length).padStart(2, '0')}</span>
                <button type="button" onClick={() => moveDetail(1)} aria-label="Mẫu màn hình tiếp theo">
                  <ArrowIcon direction="right" />
                </button>
              </div>
            </div>
          </section>
        )}

        <p className="monitor-sr-status" aria-live="polite" aria-atomic="true">
          {activeProduct ? 'Đang chọn ' + activeProduct.name : 'Chưa có sản phẩm'}
        </p>
      </section>
    </main>
  );
}
