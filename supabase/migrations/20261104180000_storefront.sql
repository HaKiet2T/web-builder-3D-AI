create or replace function public.is_store_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false);
$$;

create table if not exists public.categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  position integer not null default 0
);

create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  category_id text not null references public.categories(id),
  summary text not null default '',
  description text not null default '',
  highlights text[] not null default '{}',
  brand text not null,
  source_url text,
  status text not null default 'draft'
    check (status in ('active', 'draft', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  slug text not null,
  name text not null,
  sku text not null unique,
  price bigint not null check (price >= 0),
  compare_at_price bigint check (compare_at_price is null or compare_at_price >= 0),
  stock_status text not null default 'in-stock'
    check (stock_status in ('in-stock', 'preorder', 'out-of-stock')),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  options jsonb not null default '{}'::jsonb,
  unique (product_id, slug)
);

create table if not exists public.product_media (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  kind text not null check (kind in ('image', 'model')),
  url text not null,
  storage_path text,
  alt text not null default '',
  width integer,
  height integer,
  position integer not null default 0
);

create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  customer jsonb not null,
  items jsonb not null,
  fulfillments jsonb not null,
  subtotal bigint not null check (subtotal >= 0),
  shipping_total bigint not null check (shipping_total >= 0),
  discount_total bigint not null check (discount_total >= 0),
  total_amount bigint not null check (total_amount >= 0),
  status text not null check (
    status in ('pending', 'paid', 'processing', 'partially_fulfilled', 'fulfilled', 'cancelled', 'failed')
  ),
  payment_status text not null check (
    payment_status in ('pending', 'authorized', 'paid', 'failed', 'refunded')
  ),
  payment_method text not null,
  payment_transaction_id text,
  is_split_shipment boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_status_idx
  on public.products (category_id, status, created_at desc);
create index if not exists product_variants_product_idx
  on public.product_variants (product_id);
create index if not exists product_media_product_position_idx
  on public.product_media (product_id, position);
create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public.orders enable row level security;

grant select on public.categories, public.products, public.product_variants, public.product_media
  to anon, authenticated;
grant insert, update, delete on public.products, public.product_variants, public.product_media
  to authenticated;
grant select, update on public.orders to authenticated;
grant all on public.categories, public.products, public.product_variants, public.product_media, public.orders
  to service_role;

create policy "Categories are readable by everyone"
  on public.categories for select using (true);

create policy "Active products are readable by everyone"
  on public.products for select using (status = 'active' or public.is_store_admin());
create policy "Admins manage products"
  on public.products for all using (public.is_store_admin())
  with check (public.is_store_admin());

create policy "Variants of active products are readable"
  on public.product_variants for select using (
    public.is_store_admin() or exists (
      select 1 from public.products
      where products.id = product_variants.product_id and products.status = 'active'
    )
  );
create policy "Admins manage product variants"
  on public.product_variants for all using (public.is_store_admin())
  with check (public.is_store_admin());

create policy "Media of active products is readable"
  on public.product_media for select using (
    public.is_store_admin() or exists (
      select 1 from public.products
      where products.id = product_media.product_id and products.status = 'active'
    )
  );
create policy "Admins manage product media"
  on public.product_media for all using (public.is_store_admin())
  with check (public.is_store_admin());

create policy "Admins read orders"
  on public.orders for select using (public.is_store_admin());
create policy "Admins update orders"
  on public.orders for update using (public.is_store_admin())
  with check (public.is_store_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can list product media"
  on storage.objects for select
  using (bucket_id = 'product-media' and public.is_store_admin());
create policy "Admins upload product media"
  on storage.objects for insert
  with check (bucket_id = 'product-media' and public.is_store_admin());
create policy "Admins update product media"
  on storage.objects for update
  using (bucket_id = 'product-media' and public.is_store_admin())
  with check (bucket_id = 'product-media' and public.is_store_admin());
create policy "Admins delete product media"
  on storage.objects for delete
  using (bucket_id = 'product-media' and public.is_store_admin());
