import Link from 'next/link';
import { SITE } from '@/lib/site';

export function SetupStudioFooter() {
  return (
    <footer className="setup-studio-footer" aria-label="Thông tin Studio 3D">
      <div className="setup-studio-footer-inner">
        <div className="setup-studio-footer-brand">
          <Link href="/" className="setup-studio-footer-logo" aria-label={`${SITE.name}, về trang chủ`}>
            {SITE.name}
          </Link>
          <span className="setup-studio-footer-divider" aria-hidden="true">/</span>
          <span className="setup-studio-footer-tagline">
            Studio Thiết Kế 3D Tương Tác
          </span>
        </div>

        <div className="setup-studio-footer-tips" role="note" aria-label="Hướng dẫn tương tác nhanh">
          <span className="setup-studio-footer-tip-icon" aria-hidden="true">💡</span>
          <span>Kéo thả để bố trí vật thể trong phòng 3D • Nhấp chọn sản phẩm để xem chi tiết & combo</span>
        </div>

        <div className="setup-studio-footer-actions">
          <Link href="/mau-setup" className="setup-studio-footer-link">
            Mẫu tham khảo
          </Link>
          <Link href="/" className="setup-studio-footer-link">
            Trang chủ
          </Link>
          <span className="setup-studio-footer-copy">
            © 2026 {SITE.name}
          </span>
        </div>
      </div>
    </footer>
  );
}
