import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

const newKeyboards = [
  {
    id: 'prd_ban-phim-co-rog-falchion-ace-hfx',
    slug: 'ban-phim-co-rog-falchion-ace-hfx',
    name: 'Bàn phím cơ ROG Falchion Ace HFX',
    category_id: 'keyboard',
    brand: 'ASUS ROG',
    summary: 'Bàn phím 65% switch từ tính ROG HFX, Rapid Trigger và 8000Hz.',
    description: 'Bàn phím cơ gaming nhỏ gọn 65% trang bị switch từ tính ROG HFX với tính năng Rapid Trigger và Speed Tap, tần số phản hồi 8000Hz siêu tốc.',
    highlights: ['Layout 65%', 'Switch từ tính ROG HFX', 'Rapid Trigger 0.1-4.0mm', 'Polling rate 8000Hz'],
    status: 'active',
    created_at: new Date('2026-02-07T00:00:00.000Z').toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      {
        id: 'var_rog-falchion-ace-hfx_magnetic',
        slug: 'switch-rog-hfx',
        name: 'Switch ROG HFX Magnetic',
        sku: 'FALCHION-HFX-MAG',
        price: 4690000,
        compare_at_price: 4990000,
        stock_status: 'in-stock',
        stock_quantity: 15,
        options: { Switch: 'ROG HFX Từ Tính' },
      },
    ],
  },
  {
    id: 'prd_ban-phim-co-keychron-q1-pro',
    slug: 'ban-phim-co-keychron-q1-pro',
    name: 'Bàn phím cơ Keychron Q1 Pro',
    category_id: 'keyboard',
    brand: 'Keychron',
    summary: 'Bàn phím nhôm CNC 75% không dây, Double Gasket Mount và QMK/VIA.',
    description: 'Thân vỏ nhôm nguyên khối gia công CNC chính xác, thiết kế Double Gasket Mount êm ái, kết nối Bluetooth 5.1 đa thiết bị và tùy biến phím toàn diện qua QMK/VIA.',
    highlights: ['Layout 75%', 'Khung nhôm CNC', 'Double Gasket Mount', 'Không dây Bluetooth & Type-C'],
    status: 'active',
    created_at: new Date('2026-02-08T00:00:00.000Z').toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      {
        id: 'var_keychron-q1-pro_red',
        slug: 'switch-k-pro-red',
        name: 'Switch Keychron K Pro Đỏ',
        sku: 'Q1P-KPRO-RED',
        price: 4390000,
        compare_at_price: 4790000,
        stock_status: 'in-stock',
        stock_quantity: 12,
        options: { Switch: 'K Pro Red' },
      },
      {
        id: 'var_keychron-q1-pro_brown',
        slug: 'switch-k-pro-brown',
        name: 'Switch Keychron K Pro Nâu',
        sku: 'Q1P-KPRO-BRN',
        price: 4390000,
        compare_at_price: 4790000,
        stock_status: 'in-stock',
        stock_quantity: 8,
        options: { Switch: 'K Pro Brown' },
      },
    ],
  },
  {
    id: 'prd_ban-phim-co-nuphy-air75-v2',
    slug: 'ban-phim-co-nuphy-air75-v2',
    name: 'Bàn phím cơ NuPhy Air75 V2',
    category_id: 'keyboard',
    brand: 'NuPhy',
    summary: 'Bàn phím cơ Low-profile 75% siêu mỏng, 3 chế độ kết nối không dây.',
    description: 'Thiết kế siêu mỏng tiện lợi mang theo, switch Gateron Low-profile thế hệ mới êm mượt, keycap PBT Coast Dye-sub cao cấp và hỗ trợ 1000Hz wireless.',
    highlights: ['Layout 75% Low-Profile', 'Độ mỏng 13.5mm', '3 chế độ (2.4G/BT/Dây)', 'QMK/VIA'],
    status: 'active',
    created_at: new Date('2026-02-09T00:00:00.000Z').toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      {
        id: 'var_nuphy-air75-v2_cowberry',
        slug: 'switch-cowberry',
        name: 'Switch Cowberry 45gf',
        sku: 'AIR75V2-COWBERRY',
        price: 3290000,
        compare_at_price: null,
        stock_status: 'in-stock',
        stock_quantity: 20,
        options: { Switch: 'Cowberry Tuyến tính' },
      },
    ],
  },
  {
    id: 'prd_ban-phim-co-wooting-60he',
    slug: 'ban-phim-co-wooting-60he',
    name: 'Bàn phím cơ Wooting 60HE+',
    category_id: 'keyboard',
    brand: 'Wooting',
    summary: 'Bàn phím Hall Effect 60% eSports, Rapid Trigger 0.1mm siêu nhạy.',
    description: 'Công nghệ cảm biến hiệu ứng Hall từ tính đo hành trình phím tương tự analog, tính năng Rapid Trigger cho phép kích hoạt và nhả phím tức thì trong các tựa game FPS.',
    highlights: ['Layout 60%', 'Lekker Switch Hall Effect', 'Rapid Trigger 0.1mm', 'Độ trễ < 1ms'],
    status: 'active',
    created_at: new Date('2026-02-10T00:00:00.000Z').toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      {
        id: 'var_wooting-60he_lekker60',
        slug: 'switch-lekker-l60',
        name: 'Lekker Switch L60',
        sku: 'WT-60HE-L60',
        price: 5290000,
        compare_at_price: 5690000,
        stock_status: 'in-stock',
        stock_quantity: 9,
        options: { Switch: 'Lekker L60 Linear' },
      },
    ],
  },
  {
    id: 'prd_ban-phim-co-akko-mod007b-pc',
    slug: 'ban-phim-co-akko-mod007b-pc',
    name: 'Bàn phím cơ AKKO MOD007B-PC Tokyo',
    category_id: 'keyboard',
    brand: 'AKKO',
    summary: 'Bàn phím cơ 75% núm xoay kim loại, họa tiết Tokyo R2 độc bản.',
    description: 'Vỏ Polycarbonate xuyên LED tuyệt đẹp, núm xoay đa chức năng, cấu trúc Gasket Mount với đầy đủ foam tiêu âm poron và switch Akko V3 Piano Pro mượt mà.',
    highlights: ['Layout 75% có núm xoay', 'Gasket Mount', 'Vỏ PC Tokyo R2', 'Switch Akko Piano Pro'],
    status: 'active',
    created_at: new Date('2026-02-11T00:00:00.000Z').toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      {
        id: 'var_akko-mod007b_piano',
        slug: 'switch-akko-piano-pro',
        name: 'Switch Akko V3 Piano Pro',
        sku: 'AKKO-MOD007-PIANO',
        price: 2790000,
        compare_at_price: null,
        stock_status: 'in-stock',
        stock_quantity: 18,
        options: { Switch: 'Piano Pro' },
      },
    ],
  },
  {
    id: 'prd_ban-phim-co-varmilo-minilo-67',
    slug: 'ban-phim-co-varmilo-minilo-67',
    name: 'Bàn phím cơ Varmilo Minilo 67 Eucalyptus',
    category_id: 'keyboard',
    brand: 'Varmilo',
    summary: 'Bàn phím 65% phong cách Morandi tối giản, switch cơ học cao cấp.',
    description: 'Phối màu xanh bạch đàn Eucalyptus dịu mát mang cảm hứng nội thất Bắc Âu, kết cấu gõ chắc chắn, keycap Cherry PBT dày dặn và pin dung lượng lớn cho thời gian dùng bền bỉ.',
    highlights: ['Layout 65%', 'Tone màu Morandi Eucalyptus', 'Switch Varmilo EC V2', 'Keycap PBT V-Silk'],
    status: 'active',
    created_at: new Date('2026-02-12T00:00:00.000Z').toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      {
        id: 'var_varmilo-minilo_daisy',
        slug: 'switch-varmilo-daisy',
        name: 'Switch Varmilo EC V2 Daisy',
        sku: 'VARM-MINI-DAISY',
        price: 2990000,
        compare_at_price: 3290000,
        stock_status: 'in-stock',
        stock_quantity: 14,
        options: { Switch: 'EC V2 Daisy 35gf' },
      },
    ],
  },
];

async function seed() {
  console.log('Downloading template image from Supabase storage...');
  const { data: azothImg, error: dlErr } = await sb.storage
    .from('product-media')
    .download('prd_ban-phim-co-rog-azoth/e97a9aa7-84fc-48d0-b574-0fddb90cbc1c.png');

  if (dlErr || !azothImg) {
    console.error('Download error:', dlErr);
    process.exit(1);
  }

  const imgBuf = Buffer.from(await azothImg.arrayBuffer());

  for (const item of newKeyboards) {
    const { variants, ...prod } = item;
    console.log('Upserting product:', prod.id);
    const { error: pErr } = await sb.from('products').upsert(prod, { onConflict: 'id' });
    if (pErr) console.error('Error prod:', pErr);

    console.log('Upserting variants for:', prod.id);
    for (const v of variants) {
      const { error: vErr } = await sb.from('product_variants').upsert(
        {
          ...v,
          product_id: prod.id,
        },
        { onConflict: 'id' }
      );
      if (vErr) console.error('Error var:', vErr);
    }

    const storagePath = `${prod.id}/showcase.png`;
    console.log('Uploading media to storage:', storagePath);
    await sb.storage.from('product-media').upload(storagePath, imgBuf, {
      contentType: 'image/png',
      upsert: true,
    });

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/product-media/${storagePath}`;
    const mediaId = `med_${prod.id}_showcase`;
    console.log('Upserting media record:', mediaId);
    const { error: mErr } = await sb.from('product_media').upsert(
      {
        id: mediaId,
        product_id: prod.id,
        kind: 'image',
        url: publicUrl,
        storage_path: storagePath,
        alt: `${prod.name} - Ảnh chi tiết`,
        width: 1200,
        height: 1200,
        position: 1,
      },
      { onConflict: 'id' }
    );
    if (mErr) console.error('Error media:', mErr);
  }

  const { data: total } = await sb
    .from('products')
    .select('id, name')
    .eq('category_id', 'keyboard');
  console.log('Successfully completed! Total keyboards in Supabase now:', total?.length);
}

seed();
