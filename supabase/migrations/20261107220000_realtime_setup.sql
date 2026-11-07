-- 20261107220000_realtime_setup.sql
-- Enables targeted Supabase Realtime broadcast for orders and product_variants tables

do $$
begin
  -- Add orders to supabase_realtime publication if not already added
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  -- Add product_variants to supabase_realtime publication if not already added
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'product_variants'
  ) then
    alter publication supabase_realtime add table public.product_variants;
  end if;
end;
$$;

-- Set full replica identity for comprehensive realtime event payloads
alter table public.orders replica identity full;
alter table public.product_variants replica identity full;
