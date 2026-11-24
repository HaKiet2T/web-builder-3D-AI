-- 20261125000000_room_setup_builder.sql
-- Giai doan 1: Room Setup Builder Schema, RLS, Storage Bucket va Seed Data

-- 1. Tao bang room_setups
create table if not exists public.room_setups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  bg_image_url text not null,
  aspect_ratio numeric not null default (16.0 / 10.0) check (aspect_ratio > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  combo_discount_pct numeric not null default 0 check (combo_discount_pct >= 0 and combo_discount_pct <= 100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists room_setups_slug_idx on public.room_setups (slug);
create index if not exists room_setups_status_sort_idx on public.room_setups (status, sort_order);

-- 2. Tao bang room_items
create table if not exists public.room_items (
  id uuid primary key default gen_random_uuid(),
  setup_id uuid not null references public.room_setups(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'decor')),
  product_id text references public.products(id) on delete cascade,
  variant_id text references public.product_variants(id) on delete set null,
  custom_image_url text,
  label text,
  x_pct numeric not null check (x_pct >= 0 and x_pct <= 100),
  y_pct numeric not null check (y_pct >= 0 and y_pct <= 100),
  width_pct numeric not null check (width_pct > 0 and width_pct <= 100),
  rotation numeric not null default 0,
  flip_x boolean not null default false,
  z_index integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_items_type_payload_check check (
    (item_type = 'product' and product_id is not null) or
    (item_type = 'decor' and product_id is null and custom_image_url is not null)
  )
);

create index if not exists room_items_setup_idx on public.room_items (setup_id, z_index);
create index if not exists room_items_product_idx on public.room_items (product_id);

-- 3. Bat Row Level Security (RLS) va cap quyen
alter table public.room_setups enable row level security;
alter table public.room_items enable row level security;

grant select on public.room_setups, public.room_items to anon, authenticated;
grant insert, update, delete on public.room_setups, public.room_items to authenticated;
grant all on public.room_setups, public.room_items to service_role;

-- Policies cho room_setups
drop policy if exists "Published room setups are readable by everyone" on public.room_setups;
create policy "Published room setups are readable by everyone"
  on public.room_setups for select
  using (status = 'published' or public.is_store_admin());

drop policy if exists "Admins manage room setups" on public.room_setups;
create policy "Admins manage room setups"
  on public.room_setups for all
  using (public.is_store_admin())
  with check (public.is_store_admin());

-- Policies cho room_items
drop policy if exists "Items of published setups are readable" on public.room_items;
create policy "Items of published setups are readable"
  on public.room_items for select
  using (
    public.is_store_admin() or exists (
      select 1 from public.room_setups
      where room_setups.id = room_items.setup_id and room_setups.status = 'published'
    )
  );

drop policy if exists "Admins manage room items" on public.room_items;
create policy "Admins manage room items"
  on public.room_items for all
  using (public.is_store_admin())
  with check (public.is_store_admin());

-- 4. Storage Bucket 'room-assets' cho backgrounds/ va decor/
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-assets',
  'room-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Room assets are publicly readable" on storage.objects;
create policy "Room assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'room-assets');

drop policy if exists "Admins upload room assets" on storage.objects;
create policy "Admins upload room assets"
  on storage.objects for insert
  with check (bucket_id = 'room-assets' and public.is_store_admin());

drop policy if exists "Admins update room assets" on storage.objects;
create policy "Admins update room assets"
  on storage.objects for update
  using (bucket_id = 'room-assets' and public.is_store_admin())
  with check (bucket_id = 'room-assets' and public.is_store_admin());

drop policy if exists "Admins delete room assets" on storage.objects;
create policy "Admins delete room assets"
  on storage.objects for delete
  using (bucket_id = 'room-assets' and public.is_store_admin());

-- 5. Seed du lieu 3 goc setup hien tai
insert into public.room_setups (id, slug, title, description, bg_image_url, aspect_ratio, status, combo_discount_pct, sort_order)
values
  (
    '11111111-1111-4000-8000-000000000001',
    'goc-lam-viec-toi-gian',
    'Goc lam viec toi gian hien dai',
    'Goc may duoc thiet ke theo triet ly toi gian cua Bac Au, loai bo cac chi tiet thua thai voi giai phap giau day thong minh, ket hop man hinh ROG sieu mong va den treo chong choi mat.',
    '/home/setup-goc-lam-viec-toi-gian.png',
    1.6,
    'published',
    10,
    1
  ),
  (
    '11111111-1111-4000-8000-000000000002',
    'goc-podcast',
    'Nha sang tao trong goc podcast hien dai',
    'He thong thu am chuan phong thu, arm gan micro xoay 360 do linh hoat ket hop dan loa de ban chat luong cao va man hinh da nhiem giup viec bien tap podcast muot ma.',
    '/home/setup-goc-podcast-sang-tao.png',
    1.6,
    'published',
    12,
    2
  ),
  (
    '11111111-1111-4000-8000-000000000003',
    'van-phong-hien-dai',
    'Van phong hien dai ben khung cua xanh mat',
    'Tan dung nguon anh sang tu nhien tu khung cua so lon ket hop mang xanh sinh thai, tao cam giac thu thai, giam thieu cang thang trong nhung gio lam viec keo dai.',
    '/home/setup-van-phong-xanh-mat.png',
    1.6,
    'published',
    8,
    3
  )
on conflict (slug) do update
set title = excluded.title,
    description = excluded.description,
    bg_image_url = excluded.bg_image_url,
    aspect_ratio = excluded.aspect_ratio,
    status = excluded.status,
    combo_discount_pct = excluded.combo_discount_pct,
    sort_order = excluded.sort_order;

-- Seed cac vat pham mau trong phong setup
insert into public.room_items (id, setup_id, item_type, product_id, variant_id, custom_image_url, label, x_pct, y_pct, width_pct, rotation, flip_x, z_index)
values
  (
    '22222222-2222-4000-8000-000000000001',
    '11111111-1111-4000-8000-000000000001',
    'product',
    'prd_rog-strix-oled-xg27aqwmg',
    'var_rog-strix-oled-xg27aqwmg_tieu-chuan',
    null,
    'Man hinh ROG Strix OLED',
    50.0,
    45.0,
    32.0,
    0,
    false,
    2
  ),
  (
    '22222222-2222-4000-8000-000000000002',
    '11111111-1111-4000-8000-000000000001',
    'product',
    'prd_ban-phim-co-rog-azoth',
    'var_ban-phim-co-rog-azoth_nx-red',
    null,
    'Ban phim co ROG Azoth',
    48.0,
    78.0,
    22.0,
    0,
    false,
    3
  ),
  (
    '22222222-2222-4000-8000-000000000003',
    '11111111-1111-4000-8000-000000000001',
    'product',
    'prd_chuot-rog-harpe-ace',
    'var_chuot-rog-harpe-ace_den',
    null,
    'Chuot ROG Harpe Ace',
    68.0,
    80.0,
    10.0,
    0,
    false,
    3
  ),
  (
    '22222222-2222-4000-8000-000000000004',
    '11111111-1111-4000-8000-000000000001',
    'decor',
    null,
    null,
    '/decor/plant-succulent.png',
    'Cay xanh de ban',
    25.0,
    65.0,
    12.0,
    0,
    false,
    1
  )
on conflict (id) do nothing;
