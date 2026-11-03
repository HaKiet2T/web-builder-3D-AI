import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES } from '@/data/categories';
import { monitors } from '@/data/monitors';

export const metadata: Metadata = {
  title: 'Thiết bị góc máy',
  description: 'Chọn nhóm thiết bị bạn cần: màn hình, loa, chuột, bàn phím và đèn màn hình.',
};

function categoryMeta(categoryId: string) {
  if (categoryId === 'monitor') return monitors.length + ' mẫu';
  return 'Đang cập nhật';
}

export default function HomePage() {
  return (
    <div className="home-page">
      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <h1 id="home-title">Chọn thiết bị</h1>
          <p className="home-intro">
            Năm nhóm thiết bị cho một góc máy. Bộ sưu tập màn hình đã sẵn sàng, bốn nhóm còn lại
            đang được hoàn thiện.
          </p>
        </section>

        <ul className="home-index">
          {CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link className="home-row" href={category.href}>
                <span className="home-row-name">{category.label}</span>
                <span className="home-row-description">{category.description}</span>
                <span className="home-row-tail">
                  <span className="home-row-meta">{categoryMeta(category.id)}</span>
                  <span className="home-row-arrow" aria-hidden="true">
                    ↗
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <footer className="home-footer">
        <span>Forma</span>
        <span>Thiết bị góc máy</span>
      </footer>
    </div>
  );
}
