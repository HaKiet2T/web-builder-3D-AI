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

  // ---------- Speakers (Acoustic Waveform & Desk Stage Collection) ----------
  {
    slug: 'loa-ban-asus-rog-cetra',
    name: 'ROG Cetra 2.0 Desktop Gaming Speakers',
    categoryId: 'speaker',
    brand: 'ASUS ROG',
    sourceUrl: 'https://rog.asus.com/audio/speakers/',
    summary: 'Cặp loa 2.0 để bàn chuyên game với củ loa màng carbon và đèn nền Aura Sync RGB.',
    description:
      'Hệ thống loa để bàn stereo 2.0 cao cấp, tích hợp củ loa tweeter vòm lụa 0.75 inch và củ loa trầm carbon 3 inch, thiết kế chân đế nghiêng 12 độ chuẩn công thái học và núm điều khiển âm lượng cơ học.',
    highlights: ['Công suất 30 W RMS', 'Hi-Res Audio 40 kHz', 'Aura Sync RGB', 'Kèm chân đế nghiêng'],
    image: '/products/speaker/rog-cetra-20.svg',
    createdAt: '2026-02-01T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'ROG-CETRA-BK',
        price: 2_490_000,
        compareAtPrice: 2_990_000,
        stockQuantity: 24,
        options: { 'Màu': 'Đen' },
      },
      {
        slug: 'trang',
        name: 'Trắng',
        sku: 'ROG-CETRA-WH',
        price: 2_490_000,
        compareAtPrice: 2_990_000,
        stockQuantity: 12,
        options: { 'Màu': 'Trắng' },
      },
    ],
  },
  {
    slug: 'loa-soundbar-rog-strix',
    name: 'ROG Strix Soundbar Gaming',
    categoryId: 'speaker',
    brand: 'ASUS ROG',
    sourceUrl: 'https://rog.asus.com/audio/soundbars/',
    summary: 'Soundbar gaming 4 củ loa công suất 50W, chuẩn âm vòm không gian và dải đèn gầm Aura Sync.',
    description:
      'Soundbar chuyên dụng đặt chân màn hình với 4 củ loa nam châm Neodymium, hỗ trợ giải mã âm thanh vòm Dolby Atmos Spatial Audio và đa kết nối Bluetooth 5.3, USB-C, Optical.',
    highlights: ['Công suất 50 W Quad-driver', 'Dolby Atmos Spatial', 'Bluetooth 5.3 + Type-C', 'Đèn gầm Aura RGB'],
    image: '/products/speaker/rog-strix-soundbar.svg',
    createdAt: '2026-02-02T00:00:00.000Z',
    variants: [
      {
        slug: 'den-titanium',
        name: 'Đen Titanium',
        sku: 'ROG-STRIX-SB-BK',
        price: 4_190_000,
        compareAtPrice: 4_690_000,
        stockQuantity: 15,
        options: { 'Màu': 'Đen Titanium' },
      },
    ],
  },
  {
    slug: 'loa-ban-edifier-s880db',
    name: 'Edifier S880DB Hi-Res Studio Monitors',
    categoryId: 'speaker',
    brand: 'Edifier',
    sourceUrl: 'https://www.edifier.com/product-s880db.html',
    summary: 'Loa kiểm âm Hi-Res để bàn với tweeter màng Titanium 19mm và màn hình OLED hiển thị ngõ vào.',
    description:
      'Cặp loa kiểm âm phòng thu để bàn đạt chứng nhận Hi-Res Audio 192kHz/24bit, ốp gỗ tự nhiên sang trọng hai bên hông và tích hợp mạch xử lý XMOS chuyên nghiệp.',
    highlights: ['Hi-Res Audio 192 kHz', 'Treble màng Titanium 19 mm', 'Màn hình OLED tròn', 'Vỏ ốp gỗ cao cấp'],
    image: '/products/speaker/edifier-s880db.svg',
    createdAt: '2026-02-03T00:00:00.000Z',
    variants: [
      {
        slug: 'trang-op-go',
        name: 'Trắng Ốp Gỗ',
        sku: 'EDIFIER-S880DB',
        price: 4_890_000,
        compareAtPrice: 5_490_000,
        stockQuantity: 8,
        options: { 'Màu': 'Trắng Ốp Gỗ' },
      },
    ],
  },
  {
    slug: 'loa-soundbar-compact',
    name: 'Soundbar để bàn HGK Desk Compact',
    categoryId: 'speaker',
    brand: 'HGK',
    sourceUrl: 'https://hgk.vn/audio/soundbar-compact',
    summary: 'Thanh loa gọn dưới chân màn hình vỏ nhôm nguyên khối với núm vặn Endcap kim loại.',
    description:
      'Soundbar dáng mỏng đặt gọn gàng ngay dưới màn hình làm việc, gia công từ nhôm Anodized cao cấp, tối ưu độ trong trẻo cho giọng nói hội thoại và âm nhạc acoustic.',
    highlights: ['Công suất 24 W RMS', 'Vỏ nhôm Anodized nguyên khối', 'Núm xoay Endcap cơ học', 'Bluetooth 5.3'],
    image: '/products/speaker/hgk-soundbar-compact.svg',
    createdAt: '2026-02-04T00:00:00.000Z',
    variants: [
      {
        slug: 'den-nham',
        name: 'Đen Nhám',
        sku: 'HGK-SB-40-BK',
        price: 1_890_000,
        compareAtPrice: 2_190_000,
        stockQuantity: 20,
        options: { 'Màu': 'Đen Nhám' },
      },
    ],
  },
  {
    slug: 'loa-ban-audioengine-a2-plus',
    name: 'Audioengine A2+ Wireless Desk Monitors',
    categoryId: 'speaker',
    brand: 'Audioengine',
    sourceUrl: 'https://audioengine.com/shop/wirelessspeakers/a2-wireless-computer-speakers/',
    summary: 'Loa kiểm âm không dây cao cấp với màng loa Kevlar aramid và DAC 24-bit audiophile.',
    description:
      'Chuẩn mực loa bàn làm việc Audiophile thế giới với thùng loa gỗ thủ công phủ sơn bóng satin, màng loa aramid fiber 2.75 inch và cổng kết nối mạ vàng cao cấp.',
    highlights: ['Chuẩn Studio 60 W', 'Woofer sợi Aramid 2.75 inch', 'DAC 24-bit tích hợp', 'Sơn bóng Satin thủ công'],
    image: '/products/speaker/audioengine-a2-plus.svg',
    createdAt: '2026-02-05T00:00:00.000Z',
    variants: [
      {
        slug: 'trang-satin',
        name: 'Trắng Satin',
        sku: 'A2-PLUS-WH',
        price: 6_890_000,
        compareAtPrice: 7_500_000,
        stockQuantity: 7,
        options: { 'Màu': 'Trắng Satin' },
      },
      {
        slug: 'den-satin',
        name: 'Đen Satin',
        sku: 'A2-PLUS-BK',
        price: 6_890_000,
        compareAtPrice: 7_500_000,
        stockQuantity: 9,
        options: { 'Màu': 'Đen Satin' },
      },
    ],
  },
  {
    slug: 'loa-soundbar-razer-leviathan',
    name: 'Razer Leviathan V2 X Gaming Soundbar',
    categoryId: 'speaker',
    brand: 'Razer',
    sourceUrl: 'https://www.razer.com/gaming-speakers/razer-leviathan-v2-x',
    summary: 'Soundbar PC gaming nhỏ gọn tích hợp 2 củ loa toàn dải, 2 tản âm thụ động và đèn Chroma RGB.',
    description:
      'Soundbar gaming chiều dài chỉ 400mm đặt vừa vặn bên dưới mọi loại màn hình, hỗ trợ công nghệ âm thanh sống động 90dB và đèn nền Razer Chroma RGB 14 vùng tùy biến.',
    highlights: ['Dải tần 85 Hz - 20 kHz 65 W', '2 Củ loa + 2 Tản âm thụ động', '14 Vùng Razer Chroma RGB', 'Cấp nguồn cáp USB-C'],
    image: '/products/speaker/razer-leviathan-v2x.svg',
    createdAt: '2026-02-06T00:00:00.000Z',
    variants: [
      {
        slug: 'den-chroma',
        name: 'Đen Chroma',
        sku: 'RAZER-LEVI-V2X',
        price: 2_990_000,
        compareAtPrice: 3_390_000,
        stockQuantity: 16,
        options: { 'Màu': 'Đen Chroma' },
      },
    ],
  },

  // ---------- Mouse (ASUS ROG Gaming Collection) ----------
  {
    slug: 'chuot-rog-harpe-ace',
    name: 'ROG Harpe Ace Aim Lab Edition',
    categoryId: 'mouse',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/mice-mouse-pads/mice/wireless/rog-harpe-ace-aim-lab-edition-model/',
    summary: 'Chuột esports không dây siêu nhẹ 54 g, cảm biến AimPoint 36.000 DPI.',
    description:
      'Thiết kế cùng các tuyển thủ chuyên nghiệp esports, vỏ nylon sinh học siêu nhẹ 54 g, switch quang ROG 100M lần bấm, kết nối ROG SpeedNova 2,4 GHz không dây.',
    highlights: ['54 g · Vỏ sinh học', 'AimPoint 36.000 DPI', 'ROG SpeedNova', 'Pin 90 giờ'],
    image: '/products/mouse/rog-harpe-ace.svg',
    createdAt: '2026-02-01T00:00:00.000Z',
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
        compareAtPrice: 3_990_000,
        stockQuantity: 9,
        options: { 'Màu': 'Trắng' },
      },
    ],
  },
  {
    slug: 'chuot-rog-keris-ii-ace',
    name: 'ROG Keris II Ace',
    categoryId: 'mouse',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/mice-mouse-pads/mice/wireless/rog-keris-ii-ace/',
    summary: 'Chuột công thái học esports 54 g, cảm biến ROG AimPoint Pro 42.000 DPI.',
    description:
      'Chuột gaming công thái học siêu nhẹ 54 g tối ưu cho người thuận tay phải, trang bị cảm biến ROG AimPoint Pro 42.000 DPI và Polling Rate 8.000 Hz.',
    highlights: ['Công thái học 54 g', 'AimPoint Pro 42.000 DPI', 'Polling Rate 8.000 Hz', 'Switch quang 100M'],
    image: '/products/mouse/rog-keris-ii-ace.svg',
    createdAt: '2026-02-02T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'KERIS-II-BK',
        price: 3_890_000,
        compareAtPrice: 4_290_000,
        stockQuantity: 18,
        options: { 'Màu': 'Đen' },
      },
      {
        slug: 'trang',
        name: 'Trắng',
        sku: 'KERIS-II-WH',
        price: 3_890_000,
        compareAtPrice: 4_290_000,
        stockQuantity: 12,
        options: { 'Màu': 'Trắng' },
      },
    ],
  },
  {
    slug: 'chuot-rog-chakram-x-origin',
    name: 'ROG Chakram X Origin',
    categoryId: 'mouse',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/mice-mouse-pads/mice/wireless/rog-chakram-x-origin-model/',
    summary: 'Chuột gaming cao cấp tích hợp Joystick analog, AimPoint 36.000 DPI.',
    description:
      'Dòng chuột đa năng đột phá với cần điều khiển Joystick lập trình được, 11 nút chức năng, sạc nhanh không dây Qi và con lăn quang học.',
    highlights: ['Joystick lập trình', '11 nút chức năng', 'AimPoint 36.000 DPI', 'Sạc nhanh + Sạc Qi'],
    image: '/products/mouse/rog-chakram-x.svg',
    createdAt: '2026-02-03T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'CHAKRAM-X-BK',
        price: 3_690_000,
        compareAtPrice: 4_190_000,
        stockQuantity: 14,
        options: { 'Màu': 'Đen' },
      },
    ],
  },
  {
    slug: 'chuot-rog-spatha-x',
    name: 'ROG Spatha X',
    categoryId: 'mouse',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/mice-mouse-pads/mice/wireless/rog-spatha-x-model/',
    summary: 'Quái thú MMO 12 nút bấm lập trình kèm đế sạc từ tính cao cấp.',
    description:
      'Thiết kế hầm hố cho game thủ MMO, trang bị 12 nút bấm tối ưu combo kỹ năng, đế sạc từ tính đứng sang trọng và khung hợp kim magie.',
    highlights: ['12 nút bấm MMO', 'Đế sạc từ tính', 'Cảm biến 19.000 DPI', 'Khung hợp kim Magie'],
    image: '/products/mouse/rog-spatha-x.svg',
    createdAt: '2026-02-04T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen Titan',
        sku: 'SPATHA-X-BK',
        price: 3_990_000,
        compareAtPrice: 4_590_000,
        stockQuantity: 10,
        options: { 'Màu': 'Đen Titan' },
      },
    ],
  },
  {
    slug: 'chuot-rog-gladius-iii-wireless',
    name: 'ROG Gladius III Wireless AimPoint',
    categoryId: 'mouse',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/mice-mouse-pads/mice/wireless/rog-gladius-iii-wireless-aimpoint-model/',
    summary: 'Form công thái học kinh điển 79 g, Push-Fit Switch Socket II.',
    description:
      'Kế thừa thiết kế công thái học huyền thoại Gladius, nâng cấp cảm biến AimPoint 36.000 DPI, hoa văn khắc laser chống trượt và thay switch nóng tiện lợi.',
    highlights: ['Công thái học 79 g', 'Push-Fit Switch II', 'AimPoint 36.000 DPI', 'Laser Cyber Pattern'],
    image: '/products/mouse/rog-gladius-iii.svg',
    createdAt: '2026-02-05T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'GLADIUS-III-BK',
        price: 2_590_000,
        compareAtPrice: 2_990_000,
        stockQuantity: 20,
        options: { 'Màu': 'Đen' },
      },
      {
        slug: 'trang',
        name: 'Trắng Moonlight',
        sku: 'GLADIUS-III-WH',
        price: 2_590_000,
        compareAtPrice: 2_990_000,
        stockQuantity: 16,
        options: { 'Màu': 'Trắng Moonlight' },
      },
    ],
  },
  {
    slug: 'chuot-co-day-strix-impact',
    name: 'ROG Strix Impact III Wireless',
    categoryId: 'mouse',
    brand: 'ASUS ROG',
    sourceUrl:
      'https://rog.asus.com/mice-mouse-pads/mice/wireless/rog-strix-impact-iii-wireless/',
    summary: 'Chuột đối xứng siêu bền, pin tới 450 giờ, cơ chế nút bấm Pivot.',
    description:
      'Thiết kế đối xứng linh hoạt cho cả hai tay, hỗ trợ cả pin AA hoặc AAA kèm ống chuyển đổi, mang lại thời lượng sử dụng kỷ lục 450 giờ.',
    highlights: ['Đối xứng linh hoạt', 'Pin tới 450 giờ', 'AimPoint 36.000 DPI', 'Cơ chế nút Pivot'],
    image: '/products/mouse/rog-strix-impact-iii.svg',
    createdAt: '2026-02-06T00:00:00.000Z',
    variants: [
      {
        slug: 'den',
        name: 'Đen',
        sku: 'IMPACT-III-BK',
        price: 1_490_000,
        compareAtPrice: 1_790_000,
        stockQuantity: 35,
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
  {
    slug: 'ban-phim-co-rog-falchion-ace-hfx',
    name: 'Bàn phím cơ ROG Falchion Ace HFX',
    categoryId: 'keyboard',
    brand: 'ASUS ROG',
    summary: 'Bàn phím 65% switch từ tính ROG HFX, Rapid Trigger và 8000Hz.',
    description:
      'Bàn phím cơ gaming nhỏ gọn 65% trang bị switch từ tính ROG HFX với tính năng Rapid Trigger và Speed Tap, tần số phản hồi 8000Hz siêu tốc.',
    highlights: ['Layout 65%', 'Switch từ tính ROG HFX', 'Rapid Trigger 0.1-4.0mm', 'Polling rate 8000Hz'],
    image: null,
    createdAt: '2026-02-07T00:00:00.000Z',
    variants: [
      {
        slug: 'switch-rog-hfx',
        name: 'Switch ROG HFX Magnetic',
        sku: 'FALCHION-HFX-MAG',
        price: 4_690_000,
        compareAtPrice: 4_990_000,
        stockStatus: 'in-stock',
        stockQuantity: 15,
        options: { 'Switch': 'ROG HFX Từ Tính' },
      },
    ],
  },
  {
    slug: 'ban-phim-co-keychron-q1-pro',
    name: 'Bàn phím cơ Keychron Q1 Pro',
    categoryId: 'keyboard',
    brand: 'Keychron',
    summary: 'Bàn phím nhôm CNC 75% không dây, Double Gasket Mount và QMK/VIA.',
    description:
      'Thân vỏ nhôm nguyên khối gia công CNC chính xác, thiết kế Double Gasket Mount êm ái, kết nối Bluetooth 5.1 đa thiết bị và tùy biến phím toàn diện qua QMK/VIA.',
    highlights: ['Layout 75%', 'Khung nhôm CNC', 'Double Gasket Mount', 'Không dây Bluetooth & Type-C'],
    image: null,
    createdAt: '2026-02-08T00:00:00.000Z',
    variants: [
      {
        slug: 'switch-k-pro-red',
        name: 'Switch Keychron K Pro Đỏ',
        sku: 'Q1P-KPRO-RED',
        price: 4_390_000,
        compareAtPrice: 4_790_000,
        stockStatus: 'in-stock',
        stockQuantity: 12,
        options: { 'Switch': 'K Pro Red' },
      },
      {
        slug: 'switch-k-pro-brown',
        name: 'Switch Keychron K Pro Nâu',
        sku: 'Q1P-KPRO-BRN',
        price: 4_390_000,
        compareAtPrice: 4_790_000,
        stockStatus: 'in-stock',
        stockQuantity: 8,
        options: { 'Switch': 'K Pro Brown' },
      },
    ],
  },
  {
    slug: 'ban-phim-co-nuphy-air75-v2',
    name: 'Bàn phím cơ NuPhy Air75 V2',
    categoryId: 'keyboard',
    brand: 'NuPhy',
    summary: 'Bàn phím cơ Low-profile 75% siêu mỏng, 3 chế độ kết nối không dây.',
    description:
      'Thiết kế siêu mỏng tiện lợi mang theo, switch Gateron Low-profile thế hệ mới êm mượt, keycap PBT Coast Dye-sub cao cấp và hỗ trợ 1000Hz wireless.',
    highlights: ['Layout 75% Low-Profile', 'Độ mỏng 13.5mm', '3 chế độ (2.4G/BT/Dây)', 'QMK/VIA'],
    image: null,
    createdAt: '2026-02-09T00:00:00.000Z',
    variants: [
      {
        slug: 'switch-cowberry',
        name: 'Switch Cowberry 45gf',
        sku: 'AIR75V2-COWBERRY',
        price: 3_290_000,
        stockStatus: 'in-stock',
        stockQuantity: 20,
        options: { 'Switch': 'Cowberry Tuyến tính' },
      },
    ],
  },
  {
    slug: 'ban-phim-co-wooting-60he',
    name: 'Bàn phím cơ Wooting 60HE+',
    categoryId: 'keyboard',
    brand: 'Wooting',
    summary: 'Bàn phím Hall Effect 60% eSports, Rapid Trigger 0.1mm siêu nhạy.',
    description:
      'Công nghệ cảm biến hiệu ứng Hall từ tính đo hành trình phím tương tự analog, tính năng Rapid Trigger cho phép kích hoạt và nhả phím tức thì trong các tựa game FPS.',
    highlights: ['Layout 60%', 'Lekker Switch Hall Effect', 'Rapid Trigger 0.1mm', 'Độ trễ < 1ms'],
    image: null,
    createdAt: '2026-02-10T00:00:00.000Z',
    variants: [
      {
        slug: 'switch-lekker-l60',
        name: 'Lekker Switch L60',
        sku: 'WT-60HE-L60',
        price: 5_290_000,
        compareAtPrice: 5_690_000,
        stockStatus: 'in-stock',
        stockQuantity: 9,
        options: { 'Switch': 'Lekker L60 Linear' },
      },
    ],
  },
  {
    slug: 'ban-phim-co-akko-mod007b-pc',
    name: 'Bàn phím cơ AKKO MOD007B-PC Tokyo',
    categoryId: 'keyboard',
    brand: 'AKKO',
    summary: 'Bàn phím cơ 75% núm xoay kim loại, họa tiết Tokyo R2 độc bản.',
    description:
      'Vỏ Polycarbonate xuyên LED tuyệt đẹp, núm xoay đa chức năng, cấu trúc Gasket Mount với đầy đủ foam tiêu âm poron và switch Akko V3 Piano Pro mượt mà.',
    highlights: ['Layout 75% có núm xoay', 'Gasket Mount', 'Vỏ PC Tokyo R2', 'Switch Akko Piano Pro'],
    image: null,
    createdAt: '2026-02-11T00:00:00.000Z',
    variants: [
      {
        slug: 'switch-akko-piano-pro',
        name: 'Switch Akko V3 Piano Pro',
        sku: 'AKKO-MOD007-PIANO',
        price: 2_790_000,
        stockStatus: 'in-stock',
        stockQuantity: 18,
        options: { 'Switch': 'Piano Pro' },
      },
    ],
  },
  {
    slug: 'ban-phim-co-varmilo-minilo-67',
    name: 'Bàn phím cơ Varmilo Minilo 67 Eucalyptus',
    categoryId: 'keyboard',
    brand: 'Varmilo',
    summary: 'Bàn phím 65% phong cách Morandi tối giản, switch cơ học cao cấp.',
    description:
      'Phối màu xanh bạch đàn Eucalyptus dịu mát mang cảm hứng nội thất Bắc Âu, kết cấu gõ chắc chắn, keycap Cherry PBT dày dặn và pin dung lượng lớn cho thời gian dùng bền bỉ.',
    highlights: ['Layout 65%', 'Tone màu Morandi Eucalyptus', 'Switch Varmilo EC V2', 'Keycap PBT V-Silk'],
    image: null,
    createdAt: '2026-02-12T00:00:00.000Z',
    variants: [
      {
        slug: 'switch-varmilo-daisy',
        name: 'Switch Varmilo EC V2 Daisy',
        sku: 'VARM-MINI-DAISY',
        price: 2_990_000,
        compareAtPrice: 3_290_000,
        stockStatus: 'in-stock',
        stockQuantity: 14,
        options: { 'Switch': 'EC V2 Daisy 35gf' },
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