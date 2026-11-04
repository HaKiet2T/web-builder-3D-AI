import type { Category, Product, ProductMedia, Variant } from '@/lib/catalog/types';

/**
 * Seeded catalogue.
 *
 * This is the local/offline data source. It is intentionally shaped exactly
 * like what the Supabase-backed repository will return, so swapping the source
 * is a DAL change only. Monitors keep their existing artwork and specs; the
 * other four categories carry a small realistic sample set so the shared
 * category page, cart and checkout have something to run against.
 */

const IMG = '/products/asus';

export const CATEGORY_RECORDS: Category[] = [
  {
    id: 'monitor',
    slug: 'monitor',
    name: 'Màn hình',
    description: 'Sáu mẫu ROG Strix và Swift Pro, từ 310 Hz đến 540 Hz.',
    position: 1,
  },
  {
    id: 'speaker',
    slug: 'speaker',
    name: 'Loa',
    description: 'Loa để bàn cho góc máy làm việc và chơi game.',
    position: 2,
  },
  {
    id: 'mouse',
    slug: 'mouse',
    name: 'Chuột',
    description: 'Chuột gaming có dây và không dây cho từng kiểu cầm.',
    position: 3,
  },
  {
    id: 'keyboard',
    slug: 'keyboard',
    name: 'Bàn phím',
    description: 'Bàn phím cơ với nhiều kích cỡ và loại switch.',
    position: 4,
  },
  {
    id: 'monitor-led',
    slug: 'monitor-led',
    name: 'Đèn màn hình',
    description: 'Đèn nền treo sau màn hình, chỉnh màu theo phong cách.',
    position: 5,
  },
];

interface SampleVariant {
  slug: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stockStatus?: Variant['stockStatus'];
  stockQuantity?: number;
  options?: Record<string, string>;
}

interface SampleProduct {
  slug: string;
  name: string;
  categoryId: Product['categoryId'];
  summary: string;
  description: string;
  highlights: string[];
  brand: string;
  sourceUrl?: string;
  image: string | null;
  imageWidth?: number;
  imageHeight?: number;
  /** Used for the ring gallery ordering and the createdAt tie-break. */
  createdAt: string;
  variants: SampleVariant[];
}

const SAMPLE_PRODUCTS: SampleProduct[] = [
  // ---------- Monitors (existing ASUS ROG collection) ----------
  {
    slug: 'rog-strix-oled-xg27aqwmg',
    name: 'ROG Strix OLED XG27AQWMG',
    categoryId: 'monitor',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/us/monitors/27-to-31-5-inches/rog-strix-oled-xg27aqwmg/spec/',
    summary: 'WOLED Tandem 26,5 inch, QHD 280 Hz.',
    description:
      'Màn hình OLED Tandem với độ sáng cao và tuổi thọ điểm ảnh tốt hơn, dành cho người chơi cần màu sâu và độ trễ thấp.',
    highlights: ['26,5 inch · WOLED Tandem', 'QHD · 2560 × 1440', '280 Hz', '0,03 ms GTG'],
    image: `${IMG}/ROG%20Strix%20OLED%20XG27AQWMG.png`,
    createdAt: '2026-01-06T00:00:00.000Z',
    variants: [
      {
        slug: 'tieu-chuan',
        name: 'Tiêu chuẩn',
        sku: 'XG27AQWMG',
        price: 18_990_000,
        compareAtPrice: 21_490_000,
        stockQuantity: 12,
        options: { 'Phiên bản': 'Tiêu chuẩn' },
      },
    ],
  },
  {
    slug: 'rog-strix-xg259cms',
    name: 'ROG Strix XG259CMS',
    categoryId: 'monitor',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/us/monitors/23-to-24-5-inches/rog-strix-xg259cms/spec/?config=90LM0A40-B013B0',
    summary: 'Fast IPS 24,5 inch, 310 Hz OC.',
    description:
      'Màn hình esports cỡ nhỏ với tần số quét cao, phù hợp cho thi đấu và không chiếm nhiều diện tích bàn.',
    highlights: ['24,5 inch · Fast IPS', 'Full HD · 1920 × 1080', '310 Hz OC', '1 ms GTG'],
    image: `${IMG}/ROG%20Strix%20XG259CMS.png`,
    createdAt: '2026-01-05T00:00:00.000Z',
    variants: [
      {
        slug: 'tieu-chuan',
        name: 'Tiêu chuẩn',
        sku: 'XG259CMS',
        price: 6_490_000,
        stockQuantity: 30,
        options: { 'Phiên bản': 'Tiêu chuẩn' },
      },
    ],
  },
  {
    slug: 'rog-strix-xg259qn',
    name: 'ROG Strix XG259QN',
    categoryId: 'monitor',
    brand: 'ASUS ROG',
    sourceUrl: 'https://rog.asus.com/monitors/23-to-24-5-inches/rog-strix-xg259qn/spec/',
    summary: 'IPS 24,5 inch, tối đa 380 Hz.',
    description:
      'Tần số quét 380 Hz trên tấm nền IPS giúp chuyển động mượt mà, phù hợp cho FPS tốc độ cao.',
    highlights: ['24,5 inch · IPS', 'Full HD · 1920 × 1080', 'Tối đa 380 Hz', '1 ms GTG · 0,3 ms tối thiểu'],
    image: `${IMG}/ROG%20Strix%20XG259QN.png`,
    createdAt: '2026-01-04T00:00:00.000Z',
    variants: [
      {
        slug: 'tieu-chuan',
        name: 'Tiêu chuẩn',
        sku: 'XG259QN',
        price: 7_290_000,
        stockQuantity: 21,
        options: { 'Phiên bản': 'Tiêu chuẩn' },
      },
    ],
  },
  {
    slug: 'rog-strix-xg259qns',
    name: 'ROG Strix XG259QNS',
    categoryId: 'monitor',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/us/monitors/23-to-24-5-inches/rog-strix-xg259qns/spec/',
    summary: 'IPS 24,5 inch, 380 Hz, chân đế linh hoạt.',
    description:
      'Bản nâng cấp của dòng XG259 với chân đế xoay linh hoạt và tần số quét 380 Hz.',
    highlights: ['24,5 inch · IPS', 'Full HD · 1920 × 1080', 'Tối đa 380 Hz', '1 ms GTG · 0,3 ms tối thiểu'],
    image: `${IMG}/ROG%20Strix%20XG259QNS.png`,
    createdAt: '2026-01-03T00:00:00.000Z',
    variants: [
      {
        slug: 'tieu-chuan',
        name: 'Tiêu chuẩn',
        sku: 'XG259QNS',
        price: 7_990_000,
        stockQuantity: 18,
        options: { 'Phiên bản': 'Tiêu chuẩn' },
      },
    ],
  },
  {
    slug: 'rog-strix-xg259qnsr-ace',
    name: 'ROG Strix XG259QNSR Ace',
    categoryId: 'monitor',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/me-en/monitors/23-to-24-5-inches/rog-strix-xg259qnsr-ace/spec/',
    summary: 'IPS 24,5 inch, tối đa 420 Hz.',
    description:
      'Bản Ace đẩy tần số quét lên 420 Hz cho những ai cần lợi thế tối đa trong đấu trường FPS.',
    highlights: ['24,5 inch · IPS', 'Full HD · 1920 × 1080', 'Tối đa 420 Hz', '1 ms GTG · 0,3 ms tối thiểu'],
    image: `${IMG}/ROG%20Strix%20XG259QNSR%20Ace.png`,
    createdAt: '2026-01-02T00:00:00.000Z',
    variants: [
      {
        slug: 'tieu-chuan',
        name: 'Tiêu chuẩn',
        sku: 'XG259QNSR-ACE',
        price: 9_490_000,
        stockStatus: 'preorder',
        stockQuantity: 0,
        options: { 'Phiên bản': 'Ace' },
      },
    ],
  },
  {
    slug: 'rog-swift-pro-pg248qp',
    name: 'ROG Swift Pro PG248QP',
    categoryId: 'monitor',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/uk/monitors/23-to-24-5-inches/rog-swift-pro-pg248qp/spec/?config=90LM08T0-B01370',
    summary: 'Esports TN 24,1 inch, 540 Hz OC.',
    description:
      'Màn hình TN chuyên esports với 540 Hz, mẫu nhanh nhất trong bộ sưu tập hiện tại.',
    highlights: ['24,1 inch · Esports TN', 'Full HD · 1920 × 1080', '540 Hz OC', '0,2 ms GTG'],
    image: `${IMG}/ROG%20Swift%20Pro%20PG248QP.png`,
    createdAt: '2026-01-01T00:00:00.000Z',
    variants: [
      {
        slug: 'tieu-chuan',
        name: 'Tiêu chuẩn',
        sku: 'PG248QP',
        price: 15_490_000,
        stockQuantity: 6,
        options: { 'Phiên bản': 'Tiêu chuẩn' },
      },
    ],
  },

  // ---------- Speakers ----------
  {
    slug: 'loa-ban-asus-rog-cetra',
    name: 'Loa để bàn ROG Cetra',
    categoryId: 'speaker',
    brand: 'ASUS ROG',
    summary: 'Loa 2.0 để bàn, âm thanh rõ cho họp và chơi game.',
    description:
      'Cặp loa 2.0 nhỏ gọn đặt hai bên màn hình, có núm chỉnh âm lượng trên mặt trước và cổng tai nghe.',
    highlights: ['Công suất 2 × 5 W', 'Kết nối 3,5 mm', 'Núm chỉnh âm lượng', 'Kèm cổng tai nghe'],
    image: null,
    createdAt: '2026-02-01T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'ROG-CETRA-BK',
        price: 1_290_000,
        stockQuantity: 24,
        options: { 'Màu': 'Đen' },
      },
      {
        slug: 'trang',
        name: 'Trắng',
        sku: 'ROG-CETRA-WH',
        price: 1_290_000,
        stockQuantity: 10,
        options: { 'Màu': 'Trắng' },
      },
    ],
  },
  {
    slug: 'loa-soundbar-compact',
    name: 'Soundbar để bàn Compact',
    categoryId: 'speaker',
    brand: 'HGK',
    summary: 'Một thanh loa gọn dưới chân màn hình.',
    description:
      'Soundbar ngắn gọn đặt ngay dưới màn hình, tiết kiệm diện tích và giữ được độ rõ của giọng nói.',
    highlights: ['Công suất 2 × 8 W', 'Kết nối Bluetooth 5.3', 'Cổng USB-C', 'Dài 40 cm'],
    image: null,
    createdAt: '2026-02-02T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'HGK-SB-40-BK',
        price: 2_090_000,
        stockStatus: 'preorder',
        stockQuantity: 0,
        options: { 'Màu': 'Đen' },
      },
    ],
  },

  // ---------- Mouse ----------
  {
    slug: 'chuot-rog-harpe-ace',
    name: 'Chuột ROG Harpe Ace',
    categoryId: 'mouse',
    brand: 'ASUS ROG',
    summary: 'Chuột không dây siêu nhẹ 54 g, cảm biến 36.000 DPI.',
    description:
      'Thiết kế vỏ nhẹ cho kiểu cầm claw, cảm biến quang học độ chính xác cao và kết nối không dây độ trễ thấp.',
    highlights: ['Khối lượng 54 g', 'Cảm biến 36.000 DPI', 'Không dây 2,4 GHz', 'Pin tới 90 giờ'],
    image: null,
    createdAt: '2026-02-03T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'HARPE-ACE-BK',
        price: 3_490_000,
        compareAtPrice: 3_990_000,
        stockQuantity: 15,
        options: { 'Màu': 'Đen' },
      },
      {
        slug: 'trang',
        name: 'Trắng',
        sku: 'HARPE-ACE-WH',
        price: 3_490_000,
        stockQuantity: 9,
        options: { 'Màu': 'Trắng' },
      },
    ],
  },
  {
    slug: 'chuot-co-day-strix-impact',
    name: 'Chuột có dây Strix Impact',
    categoryId: 'mouse',
    brand: 'ASUS',
    summary: 'Chuột có dây 62 g, switch quang bền.',
    description:
      'Mẫu chuột có dây nhẹ, phù hợp cho người mới và các setup cần độ ổn định của kết nối có dây.',
    highlights: ['Khối lượng 62 g', 'Cảm biến 16.000 DPI', 'Switch quang', 'Cáp 1,8 m'],
    image: null,
    createdAt: '2026-02-04T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'IMPACT-BK',
        price: 890_000,
        stockQuantity: 40,
        options: { 'Màu': 'Đen' },
      },
    ],
  },

  // ---------- Keyboards ----------
  {
    slug: 'ban-phim-co-rog-azoth',
    name: 'Bàn phím cơ ROG Azoth',
    categoryId: 'keyboard',
    brand: 'ASUS ROG',
    summary: 'Bàn phím 75% không dây, switch bôi trơn sẵn.',
    description:
      'Bàn phím 75% gasket mount, switch đã bôi trơn và màn hình OLED nhỏ hiển thị trạng thái kết nối.',
    highlights: ['Layout 75%', 'Không dây 2,4 GHz + Bluetooth', 'Gasket mount', 'Màn hình OLED'],
    image: null,
    createdAt: '2026-02-05T00:00:00.000Z',
    variants: [
      {
        slug: 'switch-nx-do',
        name: 'Switch NX Đỏ',
        sku: 'AZOTH-NX-RED',
        price: 5_990_000,
        stockQuantity: 7,
        options: { 'Switch': 'NX Đỏ' },
      },
      {
        slug: 'switch-nx-nau',
        name: 'Switch NX Nâu',
        sku: 'AZOTH-NX-BRN',
        price: 5_990_000,
        stockQuantity: 5,
        options: { 'Switch': 'NX Nâu' },
      },
    ],
  },
  {
    slug: 'ban-phim-co-tkl-compact',
    name: 'Bàn phím cơ TKL Compact',
    categoryId: 'keyboard',
    brand: 'HGK',
    summary: 'Bàn phím TKL có dây, keycap PBT.',
    description:
      'Bàn phím TKL có dây với keycap PBT dày, phù hợp cho cả làm việc và chơi game.',
    highlights: ['Layout TKL', 'Keycap PBT', 'Switch tuyến tính', 'Cáp USB-C tháo rời'],
    image: null,
    createdAt: '2026-02-06T00:00:00.000Z',
    variants: [
      {
        slug: 'switch-do',
        name: 'Switch Đỏ',
        sku: 'HGK-TKL-RED',
        price: 1_590_000,
        stockQuantity: 33,
        options: { 'Switch': 'Đỏ' },
      },
      {
        slug: 'switch-nau',
        name: 'Switch Nâu',
        sku: 'HGK-TKL-BRN',
        price: 1_690_000,
        stockStatus: 'out-of-stock',
        stockQuantity: 0,
        options: { 'Switch': 'Nâu' },
      },
    ],
  },

  // ---------- Monitor LED ----------
  {
    slug: 'den-man-hinh-screenbar',
    name: 'Đèn màn hình ScreenBar',
    categoryId: 'monitor-led',
    brand: 'HGK',
    summary: 'Đèn treo màn hình, không gây lóa mắt.',
    description:
      'Đèn treo trên màn hình, chiếu sáng bàn phím mà không hắt vào mặt, có chỉnh nhiệt độ màu.',
    highlights: ['Treo trực tiếp lên màn hình', 'Nhiệt độ màu 2700–6500 K', 'Chỉnh độ sáng cảm ứng', 'Nguồn USB'],
    image: null,
    createdAt: '2026-02-07T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'SCREENBAR-BK',
        price: 1_190_000,
        stockQuantity: 26,
        options: { 'Màu': 'Đen' },
      },
    ],
  },
  {
    slug: 'den-vien-man-hinh-rgb',
    name: 'Đèn viền màn hình RGB',
    categoryId: 'monitor-led',
    brand: 'HGK',
    summary: 'Dải RGB dán sau màn hình, đồng bộ màu.',
    description:
      'Dải đèn RGB dán mặt sau màn hình, tạo quầng sáng nền và đồng bộ màu với thiết bị khác.',
    highlights: ['Dài 1,2 m', '16,8 triệu màu', 'Đồng bộ qua USB', 'Keo dán tháo rời'],
    image: null,
    createdAt: '2026-02-08T00:00:00.000Z',
    variants: [
      {
        slug: 'dai-1m2',
        name: 'Dài 1,2 m',
        sku: 'RGB-STRIP-12',
        price: 490_000,
        stockStatus: 'preorder',
        stockQuantity: 0,
        options: { 'Chiều dài': '1,2 m' },
      },
      {
        slug: 'dai-2m',
        name: 'Dài 2 m',
        sku: 'RGB-STRIP-20',
        price: 690_000,
        stockQuantity: 14,
        options: { 'Chiều dài': '2 m' },
      },
    ],
  },
];

/** Stable, deterministic ids so cart lines stay valid across reloads. */
function productId(slug: string) {
  return `prd_${slug}`;
}

export const PRODUCT_RECORDS: Product[] = SAMPLE_PRODUCTS.map((sample) => {
  const id = productId(sample.slug);

  const media: ProductMedia[] = sample.image
    ? [
        {
          id: `med_${sample.slug}_1`,
          productId: id,
          kind: 'image',
          url: sample.image,
          alt: sample.name,
          width: sample.imageWidth ?? null,
          height: sample.imageHeight ?? null,
          position: 1,
        },
      ]
    : [];

  const variants: Variant[] = sample.variants.map((variant) => ({
    id: `var_${sample.slug}_${variant.slug}`,
    productId: id,
    slug: variant.slug,
    name: variant.name,
    sku: variant.sku,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice ?? null,
    stockStatus: variant.stockStatus ?? 'in-stock',
    stockQuantity: variant.stockQuantity ?? 0,
    options: variant.options ?? {},
  }));

  return {
    id,
    slug: sample.slug,
    name: sample.name,
    categoryId: sample.categoryId,
    summary: sample.summary,
    description: sample.description,
    highlights: sample.highlights,
    brand: sample.brand,
    sourceUrl: sample.sourceUrl ?? null,
    media,
    variants,
    priceFrom: variants.reduce(
      (lowest, variant) => (variant.price < lowest ? variant.price : lowest),
      variants[0]?.price ?? 0,
    ),
    purchasable: variants.some((variant) => variant.stockStatus !== 'out-of-stock'),
    createdAt: sample.createdAt,
  };
});