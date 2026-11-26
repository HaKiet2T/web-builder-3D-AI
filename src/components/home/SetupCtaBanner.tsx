import Link from 'next/link';

export function SetupCtaBanner() {
  return (
    <section className="setup-cta-section" aria-labelledby="setup-cta-title">
      <div className="setup-cta-card">
        <div className="setup-cta-glow" aria-hidden="true" />
        <div className="setup-cta-content">
          <div className="setup-cta-badge-row">
            <span className="setup-cta-badge">Studio Setup Ảo 2026</span>
            <span className="setup-cta-tag-pill">Tính năng mới</span>
          </div>

          <h2 id="setup-cta-title" className="setup-cta-title">
            Tự Tay Sắp Đặt Góc Làm Việc Của Bạn
          </h2>

          <p className="setup-cta-desc">
            Không gian trải nghiệm tương tác dành cho khách hàng: Tự do kéo thả, di chuyển và sắp xếp màn hình, bàn phím, hệ thống loa cùng phụ kiện công thái học trên bàn làm việc thực tế trước khi đặt mua trọn bộ combo.
          </p>

          <div className="setup-cta-highlights">
            <div className="setup-cta-feature">
              <span className="setup-cta-feature-dot">✦</span>
              <span>Kéo thả tùy biến vị trí 60 FPS</span>
            </div>
            <div className="setup-cta-feature">
              <span className="setup-cta-feature-dot">✦</span>
              <span>Khóa tỷ lệ bàn làm việc thực tế</span>
            </div>
            <div className="setup-cta-feature">
              <span className="setup-cta-feature-dot">✦</span>
              <span>Chiết khấu Combo hấp dẫn đến -15%</span>
            </div>
          </div>

          <div className="setup-cta-actions">
            <Link href="/setup" className="setup-cta-btn-primary">
              <span>Bắt đầu tự phối góc setup ngay</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/mau-setup" className="setup-cta-btn-secondary">
              Xem bộ sưu tập mẫu
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
