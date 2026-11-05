import Link from 'next/link';

export function HomeHeroBanner() {
  return (
    <section className="home-hero-section" aria-label="Khuyến mãi và mẫu setup nổi bật">
      {/* Hero 1 - Banner đứng đầu dẫn đến /mau-setup */}
      <div className="hero-primary-wrapper">
        <Link
          href="/mau-setup"
          className="hero-primary-card"
          aria-label="Khám phá các mẫu setup góc làm việc tối ưu"
        >
          <div className="hero-image-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home/hero-1.png"
              alt="Mẫu setup không gian làm việc hiện đại"
              className="hero-image"
              loading="eager"
            />
            <div className="hero-gradient-overlay" />
          </div>
          <div className="hero-content">
            <span className="hero-badge">Cảm hứng Setup 2026</span>
            <h2 className="hero-title">Không Gian Làm Việc &amp; Sáng Tạo Đỉnh Cao</h2>
            <p className="hero-desc">
              Phối ghép trọn bộ thiết bị, màn hình và phụ kiện công thái học chuẩn phong cách HyperWork.
            </p>
            <span className="hero-cta">
              Khám phá mẫu setup <span aria-hidden="true" className="hero-arrow">→</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Hero 2 & Hero 3 - 2 banner dẫn đến /top-san-pham */}
      <div className="hero-secondary-grid">
        <Link
          href="/top-san-pham"
          className="hero-secondary-card"
          aria-label="Top sản phẩm công nghệ tiêu biểu"
        >
          <div className="hero-image-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home/hero-2.png"
              alt="Top thiết bị công nghệ tiêu biểu"
              className="hero-image"
              loading="lazy"
            />
            <div className="hero-gradient-overlay" />
          </div>
          <div className="hero-secondary-content">
            <span className="hero-badge">Top Sản Phẩm</span>
            <h3 className="hero-secondary-title">Thiết Bị Công Nghệ Tiêu Biểu</h3>
            <p className="hero-secondary-desc">Màn hình ROG, bàn phím cơ và chuột độ trễ cực thấp.</p>
            <span className="hero-secondary-cta">
              Xem top sản phẩm <span aria-hidden="true" className="hero-arrow">→</span>
            </span>
          </div>
        </Link>

        <Link
          href="/top-san-pham"
          className="hero-secondary-card"
          aria-label="Lựa chọn thiết bị hàng đầu cho góc máy"
        >
          <div className="hero-image-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home/hero-3.png"
              alt="Lựa chọn thiết bị đỉnh cao cho góc máy"
              className="hero-image"
              loading="lazy"
            />
            <div className="hero-gradient-overlay" />
          </div>
          <div className="hero-secondary-content">
            <span className="hero-badge">Lựa Chọn Hàng Đầu</span>
            <h3 className="hero-secondary-title">Tối Ưu Góc Máy Đỉnh Cao</h3>
            <p className="hero-secondary-desc">Âm thanh trung thực, ánh sáng bảo vệ mắt và thiết kế tinh tế.</p>
            <span className="hero-secondary-cta">
              Khám phá ngay <span aria-hidden="true" className="hero-arrow">→</span>
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
