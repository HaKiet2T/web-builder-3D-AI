-- 20261127000000_user_saved_rooms.sql
-- Bang luu nhieu khong gian 3D cua khach hang theo tai khoan nguoi dung

create table if not exists public.user_saved_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  aspect_ratio numeric not null default 1.6,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_saved_rooms_user_id_idx on public.user_saved_rooms (user_id);
create index if not exists user_saved_rooms_updated_idx on public.user_saved_rooms (updated_at desc);

alter table public.user_saved_rooms enable row level security;

grant select, insert, update, delete on public.user_saved_rooms to authenticated;
grant all on public.user_saved_rooms to service_role;

drop policy if exists "Users manage own saved rooms" on public.user_saved_rooms;
create policy "Users manage own saved rooms"
  on public.user_saved_rooms for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
