import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';

interface CategoryPlaceholderProps {
  title: string;
  description: string;
}

export function CategoryPlaceholder({ title, description }: CategoryPlaceholderProps) {
  return (
    <div className="home-page">
      <main className="home-main">
        <section className="home-hero" aria-labelledby="category-title">
          <Link className="page-back-link" href="/">
            ← Tất cả thiết bị
          </Link>
          <h1 id="category-title">{title}</h1>
          <p className="home-intro">{description}</p>
        </section>

        <p className="page-empty">
          Nhóm này chưa có sản phẩm. Trong lúc chờ, bạn xem{' '}
          <Link className="page-inline-link" href="/monitor">
            bộ sưu tập màn hình ROG
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
