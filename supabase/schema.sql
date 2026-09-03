-- Выполните этот файл один раз в Supabase SQL Editor.
-- Таблицы находятся в exposed-схеме public, поэтому RLS включён до выдачи прав.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  grade smallint check (grade between 1 and 11),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solution_links (
  id uuid primary key default gen_random_uuid(),
  book_key text not null check (char_length(book_key) between 2 and 120),
  task text not null check (char_length(task) between 1 and 120),
  provider text not null check (char_length(provider) between 1 and 80),
  url text not null check (url ~ '^https?://'),
  note text check (char_length(note) <= 500),
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text check (char_length(rejection_reason) <= 500),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rejected_solutions_need_reason check (
    status <> 'rejected' or nullif(btrim(rejection_reason), '') is not null
  )
);

create index if not exists solution_links_book_key_idx on public.solution_links(book_key);
create index if not exists solution_links_created_by_idx on public.solution_links(created_by);
create index if not exists solution_links_status_idx on public.solution_links(status);
create index if not exists solution_links_reviewed_by_idx on public.solution_links(reviewed_by);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.admin_users enable row level security;

drop policy if exists "No direct client access" on private.admin_users;
create policy "No direct client access"
on private.admin_users for all to authenticated
using (false)
with check (false);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from private.admin_users
      where user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_admin(); $$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.book_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_collection_items (
  collection_id uuid not null references public.book_collections(id) on delete cascade,
  book_key text not null check (char_length(book_key) between 2 and 120),
  added_at timestamptz not null default now(),
  primary key (collection_id, book_key)
);

create index if not exists book_collections_user_id_idx on public.book_collections(user_id);

alter table public.profiles enable row level security;
alter table public.solution_links enable row level security;
alter table public.book_collections enable row level security;
alter table public.book_collection_items enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.solution_links from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.solution_links to anon, authenticated;
grant insert, update, delete on public.solution_links to authenticated;
revoke all on public.book_collections from anon, authenticated;
revoke all on public.book_collection_items from anon, authenticated;
grant select, insert, update, delete on public.book_collections to authenticated;
grant select, insert, delete on public.book_collection_items to authenticated;

drop policy if exists "Profiles are readable by signed users" on public.profiles;
create policy "Profiles are readable by signed users"
on public.profiles for select to authenticated
using (true);

drop policy if exists "Users create their profile" on public.profiles;
create policy "Users create their profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users update their profile" on public.profiles;
create policy "Users update their profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Solutions are publicly readable" on public.solution_links;
create policy "Solutions are publicly readable"
on public.solution_links for select to anon
using (status = 'approved');

drop policy if exists "Signed users read approved or owned solutions" on public.solution_links;
create policy "Signed users read approved or owned solutions"
on public.solution_links for select to authenticated
using (
  status = 'approved'
  or created_by = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists "Users create owned solutions" on public.solution_links;
create policy "Users create owned solutions"
on public.solution_links for insert to authenticated
with check ((select auth.uid()) = created_by and status = 'pending');

drop policy if exists "Users update owned solutions" on public.solution_links;
create policy "Users update owned solutions"
on public.solution_links for update to authenticated
using (
  ((select auth.uid()) = created_by and status = 'pending')
  or (select private.is_admin())
)
with check (
  ((select auth.uid()) = created_by and status = 'pending')
  or (select private.is_admin())
);

drop policy if exists "Users delete owned solutions" on public.solution_links;
create policy "Users delete owned solutions"
on public.solution_links for delete to authenticated
using (
  ((select auth.uid()) = created_by and status = 'pending')
  or (select private.is_admin())
);

drop policy if exists "Users read owned collections" on public.book_collections;
create policy "Users read owned collections" on public.book_collections
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users create owned collections" on public.book_collections;
create policy "Users create owned collections" on public.book_collections
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update owned collections" on public.book_collections;
create policy "Users update owned collections" on public.book_collections
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete owned collections" on public.book_collections;
create policy "Users delete owned collections" on public.book_collections
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users read items in owned collections" on public.book_collection_items;
create policy "Users read items in owned collections" on public.book_collection_items
for select to authenticated using (exists (
  select 1 from public.book_collections c
  where c.id = collection_id and c.user_id = (select auth.uid())
));

drop policy if exists "Users add items to owned collections" on public.book_collection_items;
create policy "Users add items to owned collections" on public.book_collection_items
for insert to authenticated with check (exists (
  select 1 from public.book_collections c
  where c.id = collection_id and c.user_id = (select auth.uid())
));

drop policy if exists "Users delete items from owned collections" on public.book_collection_items;
create policy "Users delete items from owned collections" on public.book_collection_items
for delete to authenticated using (exists (
  select 1 from public.book_collections c
  where c.id = collection_id and c.user_id = (select auth.uid())
));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'solution_links'
  ) then
    alter publication supabase_realtime add table public.solution_links;
  end if;
end $$;
