import Link from 'next/link';
import type { Category } from '@/lib/catalog/types';

interface CategoryShowcaseProps {
  categories: Category[];
  counts: Record<string, number>;
}

function CategoryIcon({ slug }: { slug: string }) {
  switch (slug) {
    case 'monitor':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-card-icon" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case 'speaker':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-card-icon" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <circle cx="12" cy="14" r="4" />
          <circle cx="12" cy="6" r="1" />
        </svg>
      );
    case 'mouse':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-card-icon" aria-hidden="true">
          <rect x="6" y="2" width="12" height="20" rx="6" />
          <line x1="12" y1="6" x2="12" y2="10" />
        </svg>
      );
    case 'keyboard':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-card-icon" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="6" y1="10" x2="6.01" y2="10" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="10" x2="10.01" y2="10" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="10" x2="14.01" y2="10" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="10" x2="18.01" y2="10" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="14" x2="16" y2="14" strokeLinecap="round" />
        </svg>
      );
    case 'monitor-led':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-card-icon" aria-hidden="true">
          <line x1="3" y1="4" x2="21" y2="4" strokeLinecap="round" />
          <path d="M12 4v4m-5 4 1 6h8l1-6H7z" />
          <line x1="9" y1="20" x2="15" y2="20" strokeLinecap="round" />
        </svg>
      );
  }
}

export function CategoryShowcase({ categories, counts }: CategoryShowcaseProps) {
  return (
    <section className="category-showcase-section" aria-labelledby="category-showcase-title">
      <div className="section-header">
        <span className="section-eyebrow">HỆ SINH THÁI THIẾT BỊ</span>
        <h2 id="category-showcase-title" className="section-title">
          Danh Mục Sản Phẩm
        </h2>
        <p className="section-subtitle">
          Tối ưu hóa từng chi tiết trên bàn làm việc với các dòng sản phẩm chất lượng cao.
        </p>
      </div>

      <div className="category-grid">
        {categories.map((category) => {
          const count = counts[category.id] ?? 0;
          return (
            <Link
              key={category.id}
              href={`/${category.slug}`}
              className="category-card"
              aria-label={`${category.name} - ${count} mẫu sản phẩm`}
            >
              <div className="category-card-top">
                <CategoryIcon slug={category.slug} />
                <span className="category-card-count">
                  {count === 0 ? 'Mới' : `${count} mẫu`}
                </span>
              </div>
              <div className="category-card-body">
                <h3 className="category-card-name">{category.name}</h3>
                <p className="category-card-desc">{category.description}</p>
              </div>
              <div className="category-card-footer">
                <span className="category-card-action">
                  Khám phá <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
