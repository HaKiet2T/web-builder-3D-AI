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
    slug: 'goc-lam-viec-toi-gian',
    title: 'Góc làm việc tối giản hiện đại',
    tag: 'Minimalist Workspace',
    description: 'Bố cục tinh gọn, tông màu sáng thanh lịch, tối đa hóa sự tập trung và ngăn nắp.',
    image: '/home/setup-goc-lam-viec-toi-gian.png',
    aspect: '16/9',
  },
  {
    id: 'setup-2',
    slug: 'goc-podcast',
    title: 'Nhà sáng tạo trong góc podcast hiện đại',
    tag: 'Creator & Podcast Studio',
    description: 'Tích hợp hệ thống mic chuyên nghiệp, loa vòm và màn hình kép cho streamer.',
    image: '/home/setup-goc-podcast-sang-tao.png',
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

export function SetupCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsMouseDown(true);
    dragDistanceRef.current = 0;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    dragDistanceRef.current = Math.abs(walk);
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    // If the user was dragging, prevent navigation
    if (dragDistanceRef.current > 8) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const scrollBy = (offset: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section className="setup-carousel-section" aria-labelledby="setup-carousel-title">
      <div className="setup-carousel-header">
        <div>
          <span className="section-eyebrow">KHÔNG GIAN TRẢI NGHIỆM</span>
          <h2 id="setup-carousel-title" className="section-title">
            Cảm Hứng Setup Góc Làm Việc
          </h2>
          <p className="section-subtitle">
            Khám phá các góc máy thực tế được phối ghép đồng bộ, tạo cảm hứng sáng tạo và tối ưu công năng.
          </p>
        </div>

        <div className="setup-carousel-controls">
          <span className="setup-carousel-hint" aria-hidden="true">
            Kéo qua lại để xem tiếp ↔
          </span>
          <div className="setup-carousel-nav">
            <button
              type="button"
              className="carousel-nav-btn"
              onClick={() => scrollBy(-420)}
              disabled={!canScrollLeft}
              aria-label="Xem góc setup trước"
            >
              ←
            </button>
            <button
              type="button"
              className="carousel-nav-btn"
              onClick={() => scrollBy(420)}
              disabled={!canScrollRight}
              aria-label="Xem góc setup tiếp theo"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`setup-carousel-track ${isMouseDown ? 'is-dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        role="region"
        aria-label="Danh sách không gian setup kéo ngang"
      >
        {SETUP_ITEMS.map((item) => (
          <div key={item.id} className="setup-carousel-item">
            <Link
              href={`/khong-gian/${item.slug}`}
              className="setup-card"
              onClick={handleLinkClick}
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
                <span className="setup-card-tag">{item.tag}</span>
              </div>
              <div className="setup-card-body">
                <h3 className="setup-card-title">{item.title}</h3>
                <p className="setup-card-desc">{item.description}</p>
                <span className="setup-card-link">
                  Khám phá góc setup <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
