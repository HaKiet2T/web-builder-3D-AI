'use client';

import Link from 'next/link';
import { useRef, useState, useCallback, useEffect } from 'react';

interface SetupItem {
  id: string;
  slug: string;
  title: string;
  tag: string;
  description: string;
  image: string;
  aspect: string;
}

const SETUP_ITEMS: SetupItem[] = [
  {
    id: 'setup-1',
    slug: 'goc-podcast',
    title: 'Nhà sáng tạo trong góc podcast hiện đại',
    tag: 'Creator & Podcast Studio',
    description: 'Tích hợp hệ thống mic chuyên nghiệp, loa vòm và màn hình kép cho streamer.',
    image: '/home/setup-goc-podcast-sang-tao.png',
    aspect: '16/9',
  },
  {
    id: 'setup-2',
    slug: 'goc-lam-viec-toi-gian',
    title: 'Góc làm việc tối giản hiện đại',
    tag: 'Minimalist Workspace',
    description: 'Bố cục tinh gọn, tông màu sáng thanh lịch, tối đa hóa sự tập trung và ngăn nắp.',
    image: '/home/setup-goc-lam-viec-toi-gian.png',
    aspect: '16/9',
  },
  {
    id: 'setup-3',
    slug: 'van-phong-hien-dai',
    title: 'Văn phòng hiện đại bên khung cửa xanh mát',
    tag: 'Eco Green Office',
    description: 'Hòa quyện cùng ánh sáng tự nhiên và cây xanh, khơi nguồn cảm hứng mỗi ngày.',
    image: '/home/setup-van-phong-xanh-mat.png',
    aspect: '16/9',
  },
];

// 5 bộ phần tử nhân bản để tạo vòng lặp trượt vô tận mượt mà
const EXTENDED_ITEMS: SetupItem[] = [
  ...SETUP_ITEMS,
  ...SETUP_ITEMS,
  ...SETUP_ITEMS,
  ...SETUP_ITEMS,
  ...SETUP_ITEMS,
];

const BASE_COUNT = SETUP_ITEMS.length; // 3
// Bắt đầu ở tập giữa: index 7 (tương ứng SETUP_ITEMS[1]: Góc làm việc tối giản hiện đại)
const INITIAL_INDEX = BASE_COUNT * 2 + 1;
const AUTOPLAY_INTERVAL = 7000; // 7 giây theo yêu cầu
const CAROUSEL_GAP = 8; // px rãnh giữa các ảnh

export function SetupCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [trackIndex, setTrackIndex] = useState(INITIAL_INDEX);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const [containerWidth, setContainerWidth] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);
  const [timerKey, setTimerKey] = useState(0);

  const dragStartXRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Tính toán kích thước: ảnh ở giữa đủ khung, 2 ảnh 2 bên chỉ còn đúng 1 nửa (50%)
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const cWidth = containerRef.current.clientWidth;
    setContainerWidth(cWidth);

    // Trên desktop: Mỗi ảnh có bề rộng sao cho ảnh giữa chiếm trọn tâm điểm, 2 ảnh 2 bên thấy đúng 1/2
    // Công thức: slideWidth = (containerWidth - 2 * CAROUSEL_GAP) / 2
    let sWidth = (cWidth - 2 * CAROUSEL_GAP) / 2;
    if (cWidth < 768) {
      sWidth = Math.min(cWidth * 0.82, 420);
    } else if (cWidth < 1024) {
      sWidth = Math.min(cWidth * 0.68, 580);
    }
    setSlideWidth(sWidth);
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  const resetTimer = useCallback(() => {
    setTimerKey((k) => k + 1);
  }, []);

  const goToNext = useCallback(() => {
    setIsTransitioning(true);
    setTrackIndex((prev) => prev + 1);
    resetTimer();
  }, [resetTimer]);

  const goToPrev = useCallback(() => {
    setIsTransitioning(true);
    setTrackIndex((prev) => prev - 1);
    resetTimer();
  }, [resetTimer]);

  const goToDot = useCallback(
    (dotIdx: number) => {
      const currentActive = ((trackIndex % BASE_COUNT) + BASE_COUNT) % BASE_COUNT;
      let diff = dotIdx - currentActive;
      if (diff === 2) diff = -1;
      if (diff === -2) diff = 1;
      if (diff === 0) return;

      setIsTransitioning(true);
      setTrackIndex((prev) => prev + diff);
      resetTimer();
    },
    [trackIndex, resetTimer]
  );

  // Tự động trình chiếu 3 ảnh chu kỳ 7s
  useEffect(() => {
    if (isPaused || isDragging) return;

    const timer = setInterval(() => {
      goToNext();
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [isPaused, isDragging, timerKey, goToNext]);

  // Chuẩn hóa vị trí vòng lặp vô tận sau khi hoàn tất hiệu ứng trượt
  const handleTransitionEnd = () => {
    if (trackIndex >= BASE_COUNT * 3 || trackIndex < BASE_COUNT * 2) {
      const normalized = (trackIndex % BASE_COUNT) + BASE_COUNT * 2;
      setIsTransitioning(false);
      setTrackIndex(normalized);
    }
  };

  // Kéo chuột / cảm ứng (drag & swipe)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsTransitioning(false);
    dragStartXRef.current = e.pageX;
    dragDistanceRef.current = 0;
    hasMovedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const currentX = e.pageX;
    const diff = currentX - dragStartXRef.current;
    dragDistanceRef.current = Math.abs(diff);
    if (Math.abs(diff) > 5) {
      hasMovedRef.current = true;
    }
    setDragOffset(diff);
  };

  const handleMouseUpOrLeave = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setIsTransitioning(true);

    if (dragOffset < -50) {
      goToNext();
    } else if (dragOffset > 50) {
      goToPrev();
    }
    setDragOffset(0);
  };

  const handleCardClick = (e: React.MouseEvent, idx: number) => {
    if (hasMovedRef.current || dragDistanceRef.current > 8) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Nếu bấm vào 2 ảnh bên cạnh -> trượt ảnh đó vào giữa
    if (idx !== trackIndex) {
      e.preventDefault();
      e.stopPropagation();
      setIsTransitioning(true);
      setTrackIndex(idx);
      resetTimer();
    }
    // Nếu bấm ảnh ở giữa -> chuyển trang theo Link Next.js
  };

  // Tính vị trí translateX căn giữa ảnh active
  const baseTranslate = containerWidth && slideWidth
    ? (containerWidth / 2) - (trackIndex * (slideWidth + CAROUSEL_GAP) + slideWidth / 2)
    : 0;
  const currentTranslate = baseTranslate + dragOffset;
  const activeDotIndex = ((trackIndex % BASE_COUNT) + BASE_COUNT) % BASE_COUNT;

  return (
    <section
      className="setup-carousel-section"
      aria-label="Không gian trải nghiệm setup góc làm việc"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        handleMouseUpOrLeave();
      }}
    >
      <div className="setup-carousel-header sr-only">
        <span className="section-eyebrow">KHÔNG GIAN TRẢI NGHIỆM</span>
        <h2 id="setup-carousel-title" className="section-title">
          Cảm Hứng Setup Góc Làm Việc
        </h2>
        <p className="section-subtitle">
          Khám phá các góc máy thực tế được phối ghép đồng bộ, tạo cảm hứng sáng tạo và tối ưu công năng.
        </p>
      </div>

      <div
        ref={containerRef}
        className="setup-carousel-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
      >
        <div
          ref={trackRef}
          className={`setup-carousel-track ${isDragging ? 'is-dragging' : ''}`}
          style={{
            transform: containerWidth ? `translateX(${currentTranslate}px)` : undefined,
            transition: isTransitioning
              ? 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {EXTENDED_ITEMS.map((item, idx) => {
            const isCenter = idx === trackIndex;
            return (
              <div
                key={`${item.id}-${idx}`}
                className={`setup-carousel-item ${isCenter ? 'is-active' : ''}`}
                style={{ width: slideWidth ? `${slideWidth}px` : undefined }}
                aria-hidden={!isCenter}
              >
                <Link
                  href={`/khong-gian/${item.slug}`}
                  className="setup-card"
                  onClick={(e) => handleCardClick(e, idx)}
                  tabIndex={isCenter ? 0 : -1}
                  aria-label={`${item.title} - ${item.tag}`}
                >
                  <div className="setup-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      draggable={false}
                      className="setup-card-img"
                    />

                    {/* Gradient tối nhẹ tạo tương phản chữ */}
                    <div className="setup-card-gradient" />

                    {/* Lớp phủ Frosted Glass mờ cho 2 ảnh bên cạnh theo mẫu paste-1793886264 */}
                    <div
                      className={`setup-card-glass-overlay ${isCenter ? 'is-hidden' : ''}`}
                      aria-hidden="true"
                    />

                    <span className="setup-card-tag">{item.tag}</span>

                    <div className="setup-card-body setup-card-content">
                      <h3 className="setup-card-title">{item.title}</h3>
                      <p className="setup-card-desc">{item.description}</p>
                      <span className="setup-card-cta-btn setup-card-link">
                        Khám phá góc setup <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Điều hướng chấm tròn & mũi tên chuẩn HyperWork ở chân cụm 3 ảnh */}
      <div className="setup-carousel-bottom-nav" aria-label="Bộ điều hướng slide setup">
        <button
          type="button"
          className="carousel-bottom-btn"
          onClick={goToPrev}
          aria-label="Góc máy trước đó"
        >
          ‹
        </button>

        <div className="carousel-dots-group" role="tablist" aria-label="Chọn góc máy hiển thị">
          {SETUP_ITEMS.map((item, dotIdx) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeDotIndex === dotIdx}
              aria-label={`Xem góc máy ${item.title}`}
              className={`carousel-dot-indicator ${activeDotIndex === dotIdx ? 'is-active' : ''}`}
              onClick={() => goToDot(dotIdx)}
            />
          ))}
        </div>

        <button
          type="button"
          className="carousel-bottom-btn"
          onClick={goToNext}
          aria-label="Góc máy tiếp theo"
        >
          ›
        </button>
      </div>
    </section>
  );
}
