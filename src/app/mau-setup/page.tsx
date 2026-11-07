import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Bộ Sưu Tập Mẫu Setup',
  description: 'Khám phá các ý tưởng phối ghép góc làm việc công thái học và giải trí hiện đại từ HGK.',
};

export default function MauSetupPage() {
  const setups = [
    {
      slug: 'goc-lam-viec-toi-gian',
      title: 'Góc làm việc tối giản hiện đại',
      tag: 'Minimalist Workspace',
      desc: 'Bố cục tinh gọn, tông màu sáng thanh lịch, tối đa hóa sự tập trung và ngăn nắp.',
      image: '/home/setup-goc-lam-viec-toi-gian.png',
    },
    {
      slug: 'goc-podcast',
      title: 'Nhà sáng tạo trong góc podcast hiện đại',
      tag: 'Creator & Podcast Studio',
      desc: 'Tích hợp hệ thống mic chuyên nghiệp, loa vòm và màn hình kép cho streamer.',
      image: '/home/setup-goc-podcast-sang-tao.png',
    },
    {
      slug: 'van-phong-hien-dai',
      title: 'Văn phòng hiện đại bên khung cửa xanh mát',
      tag: 'Eco Green Office',
      desc: 'Hòa quyện cùng ánh sáng tự nhiên và cây xanh, khơi nguồn cảm hứng mỗi ngày.',
      image: '/home/setup-van-phong-xanh-mat.png',
    },
  ];

  return (
    <div className="home-page">
      <main className="home-main">
        <nav aria-label="Điều hướng trang" className="page-breadcrumb">
          <Link href="/" className="page-back-link">
            ← Quay lại trang chủ
          </Link>
        </nav>

        <header className="home-hero" aria-labelledby="mau-setup-title">
          <span className="section-eyebrow">GALLERY CẢM HỨNG</span>
          <h1 id="mau-setup-title">Mẫu Setup Góc Máy</h1>
          <p className="home-intro">
            Tổng hợp các giải pháp phối ghép bàn nâng hạ, màn hình, ghế công thái học và phụ kiện bàn làm việc thực tế từ HGK.
          </p>
        </header>

        {/* Featured Banner */}
        <div className="destination-hero-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/home/hero-1.png"
            alt="Mẫu setup flagship 2026"
            className="destination-hero-img"
          />
          <div className="destination-hero-overlay">
            <span className="destination-hero-badge">Flagship Setup 2026</span>
            <h2 className="destination-hero-title">Góc Máy Chuẩn Công Thái Học</h2>
            <p className="destination-hero-desc">
              Thiết kế tối ưu góc nhìn, giảm tải áp lực cột sống và tăng 40% hiệu suất làm việc.
            </p>
          </div>
        </div>

        <section className="destination-section" aria-labelledby="curated-spaces-title">
          <div className="section-header">
            <span className="section-eyebrow">KHÔNG GIAN TIÊU BIỂU</span>
            <h2 id="curated-spaces-title" className="section-title">
              Các Phong Cách Setup Được Đề Xuất
            </h2>
          </div>

          <div className="setup-gallery-grid">
            {setups.map((setup) => (
              <article key={setup.slug} className="setup-gallery-card">
                <Link href={`/khong-gian/${setup.slug}`} className="setup-gallery-link">
                  <div className="setup-gallery-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setup.image}
                      alt={setup.title}
                      loading="lazy"
                      className="setup-gallery-img"
                    />
                    <span className="setup-gallery-tag">{setup.tag}</span>
                  </div>
                  <div className="setup-gallery-body">
                    <h3 className="setup-gallery-title">{setup.title}</h3>
                    <p className="setup-gallery-desc">{setup.desc}</p>
                    <span className="setup-gallery-cta">
                      Xem chi tiết góc setup →
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="roadmap-notice-box" role="status">
          <span className="roadmap-notice-badge">Thông tin phát triển</span>
          <h3 className="roadmap-notice-title">Bộ công cụ Desk Builder 3D sắp ra mắt</h3>
          <p className="roadmap-notice-desc">
            Tính năng tùy biến góc setup trực tiếp trong không gian 3D tương tác với danh mục sản phẩm của {SITE.name} đang được hoàn thiện.
          </p>
          <div className="roadmap-notice-actions">
            <Link href="/" className="roadmap-btn primary">
              Khám phá sản phẩm tại trang chủ
            </Link>
            <Link href="/monitor" className="roadmap-btn secondary">
              Trải nghiệm 3D Monitor Orbit
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
