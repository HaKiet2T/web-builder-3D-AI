'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export interface MarqueeSpecItem {
  label: string;
  category: string;
  highlight?: boolean;
}

export const DEFAULT_TECH_SPECS: MarqueeSpecItem[] = [
  { label: 'OLED 240Hz', category: 'DISPLAY', highlight: true },
  { label: '0.03ms GTG', category: 'SPEED' },
  { label: '4K UHD QUANTUM DOT', category: 'PANEL', highlight: true },
  { label: 'DCI-P3 99% CINEMATIC', category: 'COLOR' },
  { label: 'DELTA E < 1 CALIBRATED', category: 'ACCURACY' },
  { label: 'CNC ANODIZED ALUMINUM', category: 'BUILD', highlight: true },
  { label: 'WIRELESS 8000Hz POLLING', category: 'RESPONSE' },
  { label: 'RAPID TRIGGER 0.1mm', category: 'SWITCH', highlight: true },
  { label: 'HOT-SWAPPABLE GASKET', category: 'KEYBOARD' },
  { label: 'TYPE-C 100W PD EXPANSION', category: 'POWER' },
  { label: 'GAS-SPRING DUAL ARM', category: 'ERGONOMICS', highlight: true },
  { label: 'TACTILE BRUTALISM 2026', category: 'DESIGN' },
];

interface KineticMarqueeProps {
  items?: MarqueeSpecItem[];
  title?: string;
  speed?: number; // base animation duration in seconds
  className?: string;
}

export function KineticMarquee({
  items = DEFAULT_TECH_SPECS,
  title = 'Thông số phần cứng flagship & chuẩn công nghệ 2026',
  speed = 35,
  className = '',
}: KineticMarqueeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Nhân đôi mảng items để tạo vòng lặp vô tận liền mạch (infinite loop)
  const repeatedItems = [...items, ...items];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Kiểm tra tùy chọn giảm chuyển động của hệ điều hành
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    // Khởi tạo hoạt ảnh dịch chuyển vô tận bằng GSAP
    const tween = gsap.to(track, {
      xPercent: -50,
      ease: 'none',
      duration: speed,
      repeat: -1,
    });
    tweenRef.current = tween;

    let lastScrollY = window.scrollY;
    let restoreTimeout: ReturnType<typeof setTimeout> | null = null;

    // Lắng nghe tốc độ cuộn chuột (Scroll Velocity) để tăng tốc độ ticker theo thời gian thực
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      if (Math.abs(delta) < 1) return;

      // Tính toán tỉ lệ gia tốc kinetic theo nhịp cuộn
      const velocity = Math.min(Math.abs(delta) * 0.05, 3.5);
      const direction = delta >= 0 ? 1 : -1;
      const targetTimeScale = direction * (1 + velocity);

      gsap.to(tween, {
        timeScale: targetTimeScale,
        duration: 0.18,
        overwrite: 'auto',
        onComplete: () => {
          if (restoreTimeout) clearTimeout(restoreTimeout);
          restoreTimeout = setTimeout(() => {
            gsap.to(tween, {
              timeScale: 1,
              duration: 1.2,
              ease: 'power2.out',
            });
          }, 80);
        },
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (restoreTimeout) clearTimeout(restoreTimeout);
      tween.kill();
    };
  }, [speed]);

  const handleMouseEnter = () => {
    if (!tweenRef.current) return;
    setIsPaused(true);
    gsap.to(tweenRef.current, { timeScale: 0.25, duration: 0.3 });
  };

  const handleMouseLeave = () => {
    if (!tweenRef.current) return;
    setIsPaused(false);
    gsap.to(tweenRef.current, { timeScale: 1, duration: 0.5, ease: 'power2.out' });
  };

  return (
    <section
      className={`kinetic-marquee-section relative w-full overflow-hidden select-none border-y border-[var(--line)] bg-[var(--page)] text-[var(--ink)] my-6 sm:my-8 ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        backgroundColor: 'var(--page)',
        color: 'var(--ink)',
        userSelect: 'none',
      }}
      aria-label={title}
      role="region"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="kinetic-marquee-inner w-full flex items-center min-h-[52px] py-2 overflow-hidden"
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minHeight: '52px',
          padding: '8px 0',
          overflow: 'hidden',
        }}
      >
        <div
          className="kinetic-marquee-viewport relative w-full flex overflow-hidden"
          style={{
            position: 'relative',
            display: 'flex',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            ref={trackRef}
            className={`kinetic-marquee-track flex flex-row items-center whitespace-nowrap shrink-0 will-change-transform ${isPaused ? 'is-slowed' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'row',
              flex: 'none',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              width: 'max-content',
              willChange: 'transform',
            }}
            aria-hidden="false"
          >
            {repeatedItems.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className={`kinetic-spec-item inline-flex shrink-0 items-center gap-2.5 px-4 sm:px-5 cursor-default transition-transform duration-200 hover:-translate-y-px ${
                  item.highlight ? 'is-highlight' : ''
                }`}
                style={{
                  display: 'inline-flex',
                  flexShrink: 0,
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 18px',
                  whiteSpace: 'nowrap',
                  cursor: 'default',
                }}
              >
                <span
                  className={`kinetic-spec-category inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border font-mono ${
                    item.highlight
                      ? 'border-[var(--ink)] text-[var(--ink)] bg-[var(--raise)]'
                      : 'border-[var(--line)] text-[var(--soft)] bg-[var(--raise)]'
                  }`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: item.highlight
                      ? '1px solid var(--ink)'
                      : '1px solid var(--line)',
                    backgroundColor: 'var(--raise)',
                    color: item.highlight ? 'var(--ink)' : 'var(--soft)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.category}
                </span>
                <span
                  className="kinetic-spec-label text-[13px] font-extrabold uppercase tracking-wide text-[var(--ink)]"
                  style={{
                    color: 'var(--ink)',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </span>
                <span
                  className="kinetic-spec-divider inline-block ml-3 text-[9px] text-[var(--line)] select-none opacity-80"
                  style={{
                    display: 'inline-block',
                    marginLeft: '12px',
                    color: 'var(--line)',
                    fontSize: '9px',
                    opacity: 0.8,
                  }}
                  aria-hidden="true"
                >
                  ◆
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
