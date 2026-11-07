-- 20261108000000_user_auth_orders.sql
-- Adds user_id link to orders, user_addresses table, user_notifications table,
-- and establishes comprehensive Row Level Security (RLS) for User Account operations.

-- 1. Add user_id to orders table for registered customer tracking
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists orders_user_id_idx on public.orders (user_id);

-- 2. Update orders RLS policies to allow authenticated users to read their own orders
drop policy if exists "Admins read orders" on public.orders;
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
  on public.orders for select
  using (auth.uid() = user_id or public.is_store_admin());

-- 3. Create user_addresses table for saved shipping addresses
create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  street_address text not null,
  city text not null,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_addresses_user_id_idx on public.user_addresses (user_id);

alter table public.user_addresses enable row level security;

grant select, insert, update, delete on public.user_addresses to authenticated;
grant all on public.user_addresses to service_role;

create policy "Users manage own addresses"
  on public.user_addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Create user_notifications table for multi-channel order updates
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text references public.orders(id) on delete set null,
  title text not null,
  message text not null,
  type text not null default 'order'
    check (type in ('order', 'payment', 'system', 'promo')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_idx
  on public.user_notifications (user_id, is_read, created_at desc);

alter table public.user_notifications enable row level security;

grant select, update on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;

create policy "Users read own notifications"
  on public.user_notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.user_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Broadcast user_notifications over targeted Supabase Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end;
$$;

alter table public.user_notifications replica identity full;
