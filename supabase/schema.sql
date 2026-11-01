-- Second Brain Pro 4.5 — Supabase schema (safe to run more than once; also upgrades an older 4.4 setup).
-- Run in: Supabase Dashboard > SQL Editor > New query > paste > Run.

-- ---------- tables ----------
create table if not exists public.brain_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  server_ts timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.brain_files (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  file_name text not null default '',
  mime text not null default '',
  encrypted boolean not null default false,
  iv text,
  size_bytes bigint not null default 0,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  server_ts timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.brain_meta (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- upgrade path from 4.4
alter table public.brain_entries add column if not exists deleted boolean not null default false;
alter table public.brain_entries add column if not exists server_ts timestamptz not null default now();
alter table public.brain_files   add column if not exists deleted boolean not null default false;
alter table public.brain_files   add column if not exists server_ts timestamptz not null default now();

create index if not exists brain_entries_server_ts_idx on public.brain_entries (user_id, server_ts);
create index if not exists brain_files_server_ts_idx   on public.brain_files   (user_id, server_ts);

-- server_ts is stamped by the SERVER on every write, so delta-sync never depends on a phone's clock.
create or replace function public.brain_touch_server_ts() returns trigger
language plpgsql as $$ begin new.server_ts := now(); return new; end $$;
drop trigger if exists brain_entries_touch on public.brain_entries;
create trigger brain_entries_touch before insert or update on public.brain_entries for each row execute function public.brain_touch_server_ts();
drop trigger if exists brain_files_touch on public.brain_files;
create trigger brain_files_touch before insert or update on public.brain_files for each row execute function public.brain_touch_server_ts();

-- ---------- row level security: each user sees ONLY their own rows ----------
alter table public.brain_entries enable row level security;
alter table public.brain_files   enable row level security;
alter table public.brain_meta    enable row level security;

do $$ declare t text; begin
  foreach t in array array['brain_entries','brain_files','brain_meta'] loop
    execute format('drop policy if exists "%1$s_own" on public.%1$s', t);
    execute format('create policy "%1$s_own" on public.%1$s for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------- private storage bucket for attachments (PDF, images, audio) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('second-brain-private', 'second-brain-private', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "sb_files_select" on storage.objects;
drop policy if exists "sb_files_insert" on storage.objects;
drop policy if exists "sb_files_update" on storage.objects;
drop policy if exists "sb_files_delete" on storage.objects;
create policy "sb_files_select" on storage.objects for select to authenticated
  using (bucket_id = 'second-brain-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sb_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'second-brain-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sb_files_update" on storage.objects for update to authenticated
  using (bucket_id = 'second-brain-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sb_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'second-brain-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Verify (should return 3 rows, all rowsecurity = true):
-- select tablename, rowsecurity from pg_tables where schemaname='public' and tablename like 'brain_%';
