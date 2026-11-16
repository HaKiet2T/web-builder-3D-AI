-- 20261116120000_chat_support_schema.sql
-- Chat support schema: chat_sessions and chat_messages
-- Supports auth.uid() tracking for authenticated users, guest sessions, and strict RLS.

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx on public.chat_sessions (user_id);
create index if not exists chat_sessions_created_at_idx on public.chat_sessions (created_at desc);

alter table public.chat_sessions enable row level security;

grant select, insert, update, delete on public.chat_sessions to authenticated, anon;
grant all on public.chat_sessions to service_role;

-- Guard idempotent policies
drop policy if exists "Users read own chat sessions" on public.chat_sessions;
create policy "Users read own chat sessions"
  on public.chat_sessions for select
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or user_id is null
    or public.is_store_admin()
  );

drop policy if exists "Users insert chat sessions" on public.chat_sessions;
create policy "Users insert chat sessions"
  on public.chat_sessions for insert
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or user_id is null
    or public.is_store_admin()
  );

drop policy if exists "Users update own chat sessions" on public.chat_sessions;
create policy "Users update own chat sessions"
  on public.chat_sessions for update
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or user_id is null
    or public.is_store_admin()
  );

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender text not null check (sender in ('user', 'assistant', 'system')),
  content text not null,
  intent text check (intent in ('product', 'order', 'payment', 'greeting', 'rejected', 'general')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx on public.chat_messages (session_id, created_at asc);

alter table public.chat_messages enable row level security;

grant select, insert on public.chat_messages to authenticated, anon;
grant all on public.chat_messages to service_role;

drop policy if exists "Users read own chat messages" on public.chat_messages;
create policy "Users read own chat messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions
      where public.chat_sessions.id = public.chat_messages.session_id
      and (
        (auth.uid() is not null and public.chat_sessions.user_id = auth.uid())
        or public.chat_sessions.user_id is null
        or public.is_store_admin()
      )
    )
  );

drop policy if exists "Users insert chat messages" on public.chat_messages;
create policy "Users insert chat messages"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.chat_sessions
      where public.chat_sessions.id = public.chat_messages.session_id
      and (
        (auth.uid() is not null and public.chat_sessions.user_id = auth.uid())
        or public.chat_sessions.user_id is null
        or public.is_store_admin()
      )
    )
  );
