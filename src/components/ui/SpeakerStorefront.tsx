'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { SpeakerProduct } from '@/data/speakers';
import { useCartStore } from '@/store/cart';

interface SpeakerStorefrontProps {
  products: SpeakerProduct[];
}

type SoundProfile = 'hifi' | 'bass' | 'vocal';

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path
        d={direction === 'left' ? 'M19 12H5m0 0 6 6m-6-6 6-6' : 'M5 12h14m0 0-6-6m6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

const TOTAL_SPECTRUM_BARS = 36;

export function SpeakerStorefront({ products }: SpeakerStorefrontProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [volume, setVolume] = useState(72);
  const [soundProfile, setSoundProfile] = useState<SoundProfile>('hifi');
  const [isSimulatingAudio, setIsSimulatingAudio] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [addedToastId, setAddedToastId] = useState<string | null>(null);

  const dialRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<(SVGRectElement | null)[]>([]);
  const isDraggingDialRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartVolRef = useRef(72);
  const rafIdRef = useRef<number | null>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const volumeSliderId = useId();

  const productCount = products.length;
  const currentProduct = products[activeIndex] ?? products[0];

  // Frequency spectrum waveform math simulation in 60-120 FPS
  // Mutates SVG bar elements directly through ref to avoid triggering React re-renders,
  // preventing frame drops and jank when pointer moves over the page.
  useEffect(() => {
    let phase = 0;

    const tick = () => {
      phase += 0.055;
      const volMultiplier = volume / 100;
      const profileWeights = {
        hifi: { bass: 0.85, mid: 0.95, high: 0.9 },
        bass: { bass: 1.45, mid: 0.7, high: 0.6 },
        vocal: { bass: 0.55, mid: 1.35, high: 0.85 },
      }[soundProfile];

      const bars = barsRef.current;
      for (let i = 0; i < TOTAL_SPECTRUM_BARS; i++) {
        const bar = bars[i];
        if (!bar) continue;

        let rawHeight = 4;
        if (isSimulatingAudio && volume > 0) {
          const normalizedIndex = i / TOTAL_SPECTRUM_BARS;
          // Frequency bands: index 0-11: Sub-bass & Bass, 12-24: Midrange, 25-35: Highs
          let bandWeight = profileWeights.mid;
          if (normalizedIndex < 0.33) bandWeight = profileWeights.bass;
          else if (normalizedIndex > 0.66) bandWeight = profileWeights.high;

          const harmonic1 = Math.sin(phase * 1.8 + i * 0.38) * 28;
          const harmonic2 = Math.cos(phase * 2.6 - i * 0.22) * 16;
          const harmonic3 = Math.sin(phase * 4.2 + i * 0.65) * 8;
          rawHeight = Math.max(6, Math.min(130, (harmonic1 + harmonic2 + harmonic3 + 55) * bandWeight * volMultiplier));
        }

        const y = 145 - rawHeight;
        bar.setAttribute('height', rawHeight.toFixed(1));
        bar.setAttribute('y', y.toFixed(1));
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [volume, soundProfile, isSimulatingAudio]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isDetailsOpen && event.key === 'Escape') {
        setIsDetailsOpen(false);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : productCount - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveIndex((prev) => (prev < productCount - 1 ? prev + 1 : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setVolume((v) => Math.min(100, v + 5));
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setVolume((v) => Math.max(0, v - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [productCount, isDetailsOpen]);

  const stepSpeaker = useCallback(
    (delta: number) => {
      setActiveIndex((prev) => {
        const next = prev + delta;
        if (next < 0) return productCount - 1;
        if (next >= productCount) return 0;
        return next;
      });
    },
    [productCount],
  );

  // Rotary Knob drag interaction
  const handleDialPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    isDraggingDialRef.current = true;
    dragStartYRef.current = event.clientY;
    dragStartVolRef.current = volume;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDialPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingDialRef.current) return;
    const deltaY = dragStartYRef.current - event.clientY;
    const deltaVol = Math.round(deltaY * 0.75);
    const nextVol = Math.max(0, Math.min(100, dragStartVolRef.current + deltaVol));
    setVolume(nextVol);
  };

  const handleDialPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    isDraggingDialRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore if pointer capture was already lost
    }
  };

  const handleDialWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 3 : -3;
    setVolume((prev) => Math.max(0, Math.min(100, prev + delta)));
  };

  // Add To Cart handler
  const handleAddToCart = (product: SpeakerProduct) => {
    useCartStore.getState().addItem({
      productId: product.id,
      name: product.name,
      variantId: `var_${product.slug}_std`,
      variantName: 'Tiêu chuẩn',
      imageUrl: product.image,
      unitPrice: product.price,
      stockStatus: 'in-stock',
      quantity: 1,
    });
    useCartStore.getState().openCart();
    setAddedToastId(product.id);
    setTimeout(() => setAddedToastId(null), 2500);
  };

  const dialAngle = (volume / 100) * 270 - 135;
  const estimatedDb = Math.round(42 + (volume / 100) * 52);

  if (!currentProduct) {
    return (
      <main className="speaker-storefront" aria-busy="true">
        <p className="cart-loading">Chưa có sản phẩm loa trong bộ sưu tập.</p>
      </main>
    );
  }

  return (
    <main className="speaker-storefront" role="region" aria-label="Sân khấu âm thanh loa để bàn">
      {/* Background Acoustic Spectrum Waveform Visualizer */}
      <div className="speaker-waveform-container" aria-hidden="true">
        <svg
          className="speaker-waveform-svg speaker-waveform-glow"
          viewBox={`0 0 ${TOTAL_SPECTRUM_BARS * 24} 160`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveformGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#be123c" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {Array.from({ length: TOTAL_SPECTRUM_BARS }, (_, i) => {
            const x = i * 24 + 4;
            return (
              <rect
                key={i}
                ref={(el) => {
                  barsRef.current[i] = el;
                }}
                className="speaker-waveform-bar"
                x={x}
                y={125}
                width={14}
                height={20}
                rx={4}
                fill="url(#waveformGrad)"
              />
            );
          })}
        </svg>
      </div>

      {/* Top Left Product Header Overlay */}
      <header className="speaker-header-overlay">
        <span className="speaker-brand-badge">{currentProduct.brand}</span>
        <h1 className="speaker-product-title">{currentProduct.name}</h1>
        <div className="speaker-specs-pill-row">
          <span className="speaker-spec-chip">{currentProduct.powerWatts} W RMS</span>
          <span className="speaker-spec-chip">{currentProduct.frequencyResponse}</span>
          <span className="speaker-spec-chip">
            {currentProduct.speakerType === 'soundbar' ? 'Soundbar' : 'Bookshelf 2.0'}
          </span>
        </div>
        <div className="speaker-price-tag">
          {formatPrice(currentProduct.price)}
          {currentProduct.compareAtPrice && (
            <span className="speaker-compare-price">
              {formatPrice(currentProduct.compareAtPrice)}
            </span>
          )}
        </div>
        <div className="speaker-action-row">
          <button
            type="button"
            className="speaker-details-toggle-btn"
            onClick={() => setIsDetailsOpen(true)}
            aria-expanded={isDetailsOpen}
            aria-controls="speaker-spec-drawer"
          >
            Xem thông số kỹ thuật
          </button>
          <button
            type="button"
            className="speaker-add-cart-btn"
            onClick={() => handleAddToCart(currentProduct)}
          >
            {addedToastId === currentProduct.id ? 'Đã thêm vào giỏ!' : 'Thêm vào giỏ'}
          </button>
        </div>
      </header>

      {/* Top Right Sound Profile Switcher */}
      <div className="speaker-profile-container" aria-label="Bộ lọc âm thanh EQ">
        <button
          type="button"
          className="speaker-profile-btn"
          data-active={soundProfile === 'hifi'}
          onClick={() => setSoundProfile('hifi')}
        >
          Hi-Fi Studio
        </button>
        <button
          type="button"
          className="speaker-profile-btn"
          data-active={soundProfile === 'bass'}
          onClick={() => setSoundProfile('bass')}
        >
          Bass Boost Gaming
        </button>
        <button
          type="button"
          className="speaker-profile-btn"
          data-active={soundProfile === 'vocal'}
          onClick={() => setSoundProfile('vocal')}
        >
          Vocal Acoustic
        </button>
      </div>

      {/* Acoustic Desk Stage Area */}
      <section className="speaker-stage-viewport">
        <div className="speaker-center-showcase">
          <div
            className={`speaker-product-art ${isSimulatingAudio && volume > 0 ? 'speaker-woofer-pulse' : ''}`}
            data-type={currentProduct.speakerType}
          >
            <Image
              src={currentProduct.image || '/products/speaker/rog-cetra-20.svg'}
              alt={currentProduct.name}
              fill
              unoptimized
              draggable={false}
              sizes="(max-width: 640px) 90vw, (max-width: 1200px) 680px, 800px"
              className="speaker-product-image"
              priority
            />
          </div>
        </div>

        {/* Realistic Desk Surface Reflection */}
        <div className="speaker-desk-surface" aria-hidden="true">
          <div className="speaker-desk-reflection" />
        </div>
      </section>

      {/* Bottom Center Controls & Mechanical Rotary Volume Knob */}
      {/* Positioned safely in center (left: 50%, transform: translateX(-50%)) to avoid bottom-right ChatWidget */}
      <nav
        className="speaker-volume-control"
        aria-label="Điều khiển chọn loa và âm lượng sân khấu"
      >
        <button
          type="button"
          className="speaker-step-button"
          onClick={() => stepSpeaker(-1)}
          aria-label="Loa trước"
        >
          <ArrowIcon direction="left" />
        </button>

        {/* Mechanical Rotary Dial & Readout */}
        <div className="speaker-knob-cluster">
          <div
            ref={dialRef}
            className="speaker-volume-dial"
            style={{ transform: `rotate(${dialAngle}deg)` }}
            onPointerDown={handleDialPointerDown}
            onPointerMove={handleDialPointerMove}
            onPointerUp={handleDialPointerUp}
            onWheel={handleDialWheel}
            role="slider"
            aria-label="Núm xoay âm lượng cơ học"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={volume}
            tabIndex={0}
          />
          <div className="speaker-volume-readout">
            <span className="speaker-volume-label">
              Âm lượng
              <button
                type="button"
                className="speaker-audio-sim-toggle"
                onClick={() => setIsSimulatingAudio((prev) => !prev)}
                aria-label={isSimulatingAudio ? 'Tắt sóng âm' : 'Bật sóng âm'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isSimulatingAudio ? '#0284c7' : '#94a3b8',
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
              >
                ({isSimulatingAudio ? 'Sóng bật' : 'Sóng tắt'})
              </button>
            </span>
            <span className="speaker-volume-value">
              {volume}% · {estimatedDb} dB
            </span>
          </div>
          <input
            id={volumeSliderId}
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="speaker-volume-slider"
            aria-label="Thanh trượt mức âm lượng"
          />
        </div>

        <button
          type="button"
          className="speaker-step-button"
          onClick={() => stepSpeaker(1)}
          aria-label="Loa tiếp theo"
        >
          <ArrowIcon direction="right" />
        </button>

        <span className="speaker-index-badge" aria-live="polite">
          {String(activeIndex + 1).padStart(2, '0')} / {String(productCount).padStart(2, '0')}
        </span>
      </nav>

      {/* Detail Drawer Panel */}
      <aside
        id="speaker-spec-drawer"
        className="speaker-detail-panel"
        data-visible={isDetailsOpen}
        aria-hidden={!isDetailsOpen}
        inert={!isDetailsOpen}
      >
        <div className="speaker-detail-content">
          <button
            type="button"
            className="speaker-back-button"
            onClick={() => setIsDetailsOpen(false)}
            aria-label="Đóng bảng thông số"
          >
            <ArrowIcon direction="left" />
            <span>Quay lại sân khấu</span>
          </button>

          <span className="speaker-brand-badge">{currentProduct.brand}</span>
          <h2 ref={detailHeadingRef} className="speaker-detail-heading">
            {currentProduct.name}
          </h2>
          <p className="speaker-detail-price">
            {formatPrice(currentProduct.price)}
            {currentProduct.compareAtPrice && (
              <span className="speaker-compare-price">
                {formatPrice(currentProduct.compareAtPrice)}
              </span>
            )}
          </p>
          <p className="speaker-detail-description">{currentProduct.summary}</p>

          <div className="speaker-specifications">
            <h3>Thông số âm học chuẩn</h3>
            <div className="speaker-spec-grid">
              <div className="speaker-spec-item">
                <span className="speaker-spec-key">Công suất RMS</span>
                <span className="speaker-spec-val">{currentProduct.powerWatts} W</span>
              </div>
              <div className="speaker-spec-item">
                <span className="speaker-spec-key">Dải tần đáp ứng</span>
                <span className="speaker-spec-val">{currentProduct.frequencyResponse}</span>
              </div>
              <div className="speaker-spec-item">
                <span className="speaker-spec-key">Cấu hình Củ loa</span>
                <span className="speaker-spec-val">{currentProduct.driverConfiguration}</span>
              </div>
              <div className="speaker-spec-item">
                <span className="speaker-spec-key">Chuẩn thiết kế</span>
                <span className="speaker-spec-val">
                  {currentProduct.speakerType === 'soundbar' ? 'Soundbar để bàn' : 'Stereo 2.0 Bookshelf'}
                </span>
              </div>
            </div>
          </div>

          <div className="speaker-specifications">
            <h3>Cổng kết nối hỗ trợ</h3>
            <div className="speaker-specs-pill-row">
              {currentProduct.connectivity.map((conn) => (
                <span key={conn} className="speaker-spec-chip">
                  {conn}
                </span>
              ))}
            </div>
          </div>

          <div className="speaker-action-row">
            <button
              type="button"
              className="speaker-add-cart-btn"
              onClick={() => handleAddToCart(currentProduct)}
            >
              {addedToastId === currentProduct.id ? 'Đã thêm vào giỏ!' : 'Thêm vào giỏ'}
            </button>
          </div>

          <a
            href={currentProduct.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="speaker-source-link"
          >
            Xem thông số chính thức từ nhà sản xuất
            <span aria-hidden="true">↗</span>
          </a>

          <div className="speaker-detail-navigation">
            <button
              type="button"
              className="speaker-step-button"
              onClick={() => stepSpeaker(-1)}
              aria-label="Loa trước"
            >
              <ArrowIcon direction="left" />
            </button>
            <span className="speaker-index-badge">
              {String(activeIndex + 1).padStart(2, '0')} / {String(productCount).padStart(2, '0')}
            </span>
            <button
              type="button"
              className="speaker-step-button"
              onClick={() => stepSpeaker(1)}
              aria-label="Loa tiếp theo"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}
