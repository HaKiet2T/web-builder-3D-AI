import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/layout/SiteFooter';

interface SpaceData {
  slug: string;
  title: string;
  tag: string;
  subtitle: string;
  description: string;
  image: string;
  specs: Array<{ label: string; value: string }>;
  suggestedCategories: Array<{ name: string; slug: string }>;
}

const SPACES: Record<string, SpaceData> = {
  'goc-lam-viec-toi-gian': {
    slug: 'goc-lam-viec-toi-gian',
    title: 'Góc làm việc tối giản hiện đại',
    tag: 'Minimalist Workspace',
    subtitle: 'Tối ưu diện tích, tông màu thanh lịch, giữ sự tập trung cao độ.',
    description:
      'Góc máy được thiết kế theo triết lý tối giản của Bắc Âu, loại bỏ các chi tiết thừa thãi với giải pháp giấu dây thông minh, kết hợp màn hình ROG siêu mỏng và đèn treo chống chói mắt.',
    image: '/home/setup-goc-lam-viec-toi-gian.png',
    specs: [
      { label: 'Phong cách', value: 'Minimalism / Hiện đại' },
      { label: 'Tông màu chủ đạo', value: 'Trắng tinh khôi & Gỗ sồi sáng' },
      { label: 'Thiết bị chính', value: 'Màn hình ROG Strix OLED & Bàn phím cơ không dây' },
      { label: 'Đối tượng phù hợp', value: 'Lập trình viên, Designer, Writer' },
    ],
    suggestedCategories: [
      { name: 'Màn hình', slug: 'monitor' },
      { name: 'Bàn phím cơ', slug: 'keyboard' },
      { name: 'Đèn treo màn hình', slug: 'monitor-led' },
    ],
  },
  'goc-podcast': {
    slug: 'goc-podcast',
    title: 'Nhà sáng tạo trong góc podcast hiện đại',
    tag: 'Creator & Podcast Studio',
    subtitle: 'Không gian sản xuất nội dung chuyên nghiệp với âm thanh và ánh sáng chuẩn studio.',
    description:
      'Hệ thống thu âm chuẩn phòng thu, arm gắn micro xoay 360 độ linh hoạt kết hợp dàn loa để bàn chất lượng cao và màn hình đa nhiệm giúp việc biên tập podcast mượt mà.',
    image: '/home/setup-goc-podcast-sang-tao.png',
    specs: [
      { label: 'Phong cách', value: 'Studio Pro / Creative Hub' },
      { label: 'Tông màu chủ đạo', value: 'Xám than chì & Đèn Warm Light' },
      { label: 'Thiết bị chính', value: 'Loa Studio One, Chuột không dây công thái học' },
      { label: 'Đối tượng phù hợp', value: 'Podcaster, Streamer, Video Editor' },
    ],
    suggestedCategories: [
      { name: 'Hệ thống Loa', slug: 'speaker' },
      { name: 'Chuột công thái học', slug: 'mouse' },
      { name: 'Màn hình', slug: 'monitor' },
    ],
  },
  'van-phong-hien-dai': {
    slug: 'van-phong-hien-dai',
    title: 'Văn phòng hiện đại bên khung cửa xanh mát',
    tag: 'Eco Green Office',
    subtitle: 'Giao thoa giữa công nghệ đỉnh cao và thiên nhiên trong lành.',
    description:
      'Tận dụng nguồn ánh sáng tự nhiên từ khung cửa sổ lớn kết hợp mảng xanh sinh thái, tạo cảm giác thư thái, giảm thiểu căng thẳng trong những giờ làm việc kéo dài.',
    image: '/home/setup-van-phong-xanh-mat.png',
    specs: [
      { label: 'Phong cách', value: 'Biophilic Design / Không gian mở' },
      { label: 'Tông màu chủ đạo', value: 'Xanh lá mộc & Gỗ Walnut tự nhiên' },
      { label: 'Thiết bị chính', value: 'Màn hình góc nhìn rộng, Loa thư giãn' },
      { label: 'Đối tượng phù hợp', value: 'Quản lý, Doanh nhân, Freelancer' },
    ],
    suggestedCategories: [
      { name: 'Màn hình', slug: 'monitor' },
      { name: 'Loa để bàn', slug: 'speaker' },
      { name: 'Đèn màn hình', slug: 'monitor-led' },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(SPACES).map((slug) => ({ slug }));
}

interface SpacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SpacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const space = SPACES[slug];
  if (!space) return { title: 'Không Gian Trải Nghiệm' };

  return {
    title: `${space.title} | Mẫu Setup HGK`,
    description: space.description,
  };
}

export default async function SpaceDetailPage({ params }: SpacePageProps) {
  const { slug } = await params;
  const space = SPACES[slug];

  if (!space) {
    notFound();
  }

  return (
    <div className="home-page">
      <main className="home-main">
        <nav aria-label="Điều hướng trang" className="page-breadcrumb">
          <Link href="/" className="page-back-link">
            ← Quay lại trang chủ
          </Link>
          <span className="breadcrumb-separator" aria-hidden="true">/</span>
          <Link href="/mau-setup" className="breadcrumb-link">
            Mẫu setup
          </Link>
          <span className="breadcrumb-separator" aria-hidden="true">/</span>
          <span className="breadcrumb-current">{space.title}</span>
        </nav>

        <header className="home-hero" aria-labelledby="space-detail-title">
          <span className="section-eyebrow">{space.tag}</span>
          <h1 id="space-detail-title">{space.title}</h1>
          <p className="home-intro">{space.subtitle}</p>
        </header>

        {/* Space Image Showcase */}
        <div className="destination-hero-card" style={{ marginBottom: 'clamp(28px, 4vw, 40px)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={space.image}
            alt={space.title}
            className="destination-hero-img"
          />
        </div>

        {/* Space Story & Breakdown */}
        <div className="space-detail-grid">
          <div className="space-detail-story">
            <h2 className="space-story-title">Triết Lý Thiết Kế</h2>
            <p className="space-story-p">{space.description}</p>

            <h3 className="space-story-subtitle">Thiết Bị Gợi Ý Cho Góc Setup Này</h3>
            <div className="space-category-pills">
              {space.suggestedCategories.map((cat) => (
                <Link key={cat.slug} href={`/${cat.slug}`} className="top-tab-pill">
                  {cat.name} ↗
                </Link>
              ))}
            </div>
          </div>

          <div className="space-detail-specs">
            <h2 className="space-specs-title">Thông Số Phối Ghép</h2>
            <dl className="space-specs-list">
              {space.specs.map((item, idx) => (
                <div key={idx} className="space-specs-row">
                  <dt className="space-specs-label">{item.label}</dt>
                  <dd className="space-specs-val">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Roadmap announcement */}
        <section className="roadmap-notice-box" role="status">
          <span className="roadmap-notice-badge">Thông tin tính năng</span>
          <h3 className="roadmap-notice-title">Mô hình phối cảnh 3D đang được hoàn thiện</h3>
          <p className="roadmap-notice-desc">
            Tính năng xoay 360 độ và thêm trực tiếp combo thiết bị của không gian này vào giỏ hàng sẽ được mở trong bản cập nhật tiếp theo.
          </p>
          <div className="roadmap-notice-actions">
            <Link href="/" className="roadmap-btn primary">
              Xem thêm các không gian khác tại Home
            </Link>
            <Link href="/top-san-pham" className="roadmap-btn secondary">
              Khám phá top sản phẩm
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
