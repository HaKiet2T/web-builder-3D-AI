import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function NotFound() {
  return (
    <div className="home-page">
      <main className="home-main">
        <section className="home-hero" aria-labelledby="not-found-title">
          <h1 id="not-found-title">Không tìm thấy trang</h1>
          <p className="home-intro">
            Đường dẫn này không còn tồn tại, hoặc sản phẩm đã được gỡ khỏi danh mục.
          </p>
        </section>

        <p className="page-empty">
          <Link className="page-inline-link" href="/">
            Về trang chủ
          </Link>{' '}
          để chọn nhóm thiết bị khác.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}