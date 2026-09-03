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
  (select auth.uid()) = created_by
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
-- Server-side abuse protection for all public write paths.
-- Limits are enforced in Postgres, so modifying the desktop client cannot bypass them.

create table if not exists private.solution_submission_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  submitted_at timestamptz[] not null default '{}'::timestamptz[],
  updated_at timestamptz not null default now(),
  constraint solution_submission_limits_max_events
    check (cardinality(submitted_at) <= 20)
);

create table if not exists private.blocked_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null default 'spam' check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table private.solution_submission_limits enable row level security;
alter table private.blocked_users enable row level security;
revoke all on table private.solution_submission_limits from public, anon, authenticated;
revoke all on table private.blocked_users from public, anon, authenticated;

drop policy if exists "No direct client access" on private.solution_submission_limits;
create policy "No direct client access"
on private.solution_submission_limits for all to authenticated
using (false)
with check (false);

drop policy if exists "No direct client access" on private.blocked_users;
create policy "No direct client access"
on private.blocked_users for all to authenticated
using (false)
with check (false);

create index if not exists solution_links_owner_created_idx
  on public.solution_links (created_by, created_at desc);

create unique index if not exists solution_links_owner_active_url_uidx
  on public.solution_links (created_by, lower(url))
  where status in ('pending', 'approved');

create unique index if not exists book_collections_owner_name_uidx
  on public.book_collections (user_id, lower(btrim(name)));

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.solution_links'::regclass
      and conname = 'solution_links_url_length_check'
  ) then
    alter table public.solution_links
      add constraint solution_links_url_length_check
      check (char_length(url) between 10 and 2048);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.solution_links'::regclass
      and conname = 'solution_links_url_no_whitespace_check'
  ) then
    alter table public.solution_links
      add constraint solution_links_url_no_whitespace_check
      check (url !~ '[[:space:]]');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_display_name_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length_check
      check (char_length(display_name) <= 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_avatar_url_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_avatar_url_length_check
      check (avatar_url is null or char_length(avatar_url) <= 2048);
  end if;
end
$constraints$;

create or replace function private.is_verified_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and coalesce(u.is_anonymous, false) is false
      and not exists (
        select 1 from private.blocked_users b
        where b.user_id = u.id
      )
  );
$function$;

revoke all on function private.is_verified_user() from public, anon, authenticated;
grant execute on function private.is_verified_user() to authenticated;

create or replace function private.guard_solution_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_events timestamptz[];
  v_hour_count integer;
  v_day_count integer;
  v_pending_count integer;
  v_total_count integer;
begin
  if v_user is null or new.created_by is distinct from v_user then
    raise exception using errcode = '42501', message = 'Нельзя отправлять ссылки от имени другого пользователя';
  end if;

  if not (select private.is_verified_user()) then
    raise exception using errcode = '42501', message = 'Для отправки ссылок нужен подтверждённый аккаунт';
  end if;

  new.book_key := btrim(new.book_key);
  new.task := btrim(new.task);
  new.provider := btrim(new.provider);
  new.url := btrim(new.url);
  new.note := nullif(btrim(new.note), '');
  new.status := 'pending';
  new.rejection_reason := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.created_at := now();
  new.updated_at := now();

  if new.url !~* '^https?://[^[:space:]]+$' or char_length(new.url) > 2048 then
    raise exception using errcode = '22023', message = 'Нужна корректная ссылка длиной не более 2048 символов';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text, 734521)
  );

  if exists (
    select 1
    from public.solution_links s
    where s.created_by = v_user
      and lower(s.url) = lower(new.url)
      and s.status in ('pending', 'approved')
  ) then
    raise exception using errcode = '23505', message = 'Эта ссылка уже была отправлена';
  end if;

  if not (select private.is_admin()) then
    insert into private.solution_submission_limits (user_id)
    values (v_user)
    on conflict (user_id) do nothing;

    select
      coalesce(
        array(
          select submitted
          from unnest(l.submitted_at) as submitted
          where submitted >= now() - interval '24 hours'
          order by submitted
        ),
        '{}'::timestamptz[]
      )
    into v_events
    from private.solution_submission_limits l
    where l.user_id = v_user
    for update;

    select
      count(*) filter (where submitted >= now() - interval '1 hour'),
      count(*)
    into v_hour_count, v_day_count
    from unnest(v_events) as submitted;

    select
      count(*) filter (where s.status = 'pending'),
      count(*)
    into v_pending_count, v_total_count
    from public.solution_links s
    where s.created_by = v_user;

    if v_hour_count >= 5 then
      raise exception using errcode = 'P0001', message = 'Лимит: не более 5 ссылок в час';
    end if;
    if v_day_count >= 20 then
      raise exception using errcode = 'P0001', message = 'Лимит: не более 20 ссылок в сутки';
    end if;
    if v_pending_count >= 50 then
      raise exception using errcode = 'P0001', message = 'Сначала дождитесь проверки ранее отправленных ссылок';
    end if;
    if v_total_count >= 500 then
      raise exception using errcode = 'P0001', message = 'Лимит: не более 500 сохранённых ссылок на аккаунт';
    end if;

    update private.solution_submission_limits
    set submitted_at = array_append(v_events, now()),
        updated_at = now()
    where user_id = v_user;
  end if;

  return new;
end
$function$;

revoke all on function private.guard_solution_insert() from public, anon, authenticated;

create or replace function private.protect_solution_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_is_admin boolean := (select private.is_admin());
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'Требуется вход в аккаунт';
  end if;

  if not v_is_admin then
    if new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
      or new.status is distinct from old.status
      or new.rejection_reason is distinct from old.rejection_reason
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
    then
      raise exception using errcode = '42501', message = 'Поля модерации может менять только администратор';
    end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if new.status is distinct from old.status then
      new.reviewed_by := v_user;
      new.reviewed_at := now();
      if new.status <> 'rejected' then
        new.rejection_reason := null;
      end if;
    end if;
  end if;

  new.book_key := btrim(new.book_key);
  new.task := btrim(new.task);
  new.provider := btrim(new.provider);
  new.url := btrim(new.url);
  new.note := nullif(btrim(new.note), '');
  new.updated_at := now();

  return new;
end
$function$;

revoke all on function private.protect_solution_update() from public, anon, authenticated;

create or replace function private.guard_collection_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_collection_count integer;
begin
  if v_user is null or new.user_id is distinct from v_user then
    raise exception using errcode = '42501', message = 'Нельзя создавать подборку от имени другого пользователя';
  end if;
  if not (select private.is_verified_user()) then
    raise exception using errcode = '42501', message = 'Для синхронизации подборок нужен подтверждённый аккаунт';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text, 892341)
  );

  select count(*) into v_collection_count
  from public.book_collections c
  where c.user_id = v_user;

  if v_collection_count >= 30 then
    raise exception using errcode = 'P0001', message = 'Лимит: не более 30 подборок';
  end if;

  new.name := btrim(new.name);
  new.created_at := now();
  new.updated_at := now();
  return new;
end
$function$;

revoke all on function private.guard_collection_insert() from public, anon, authenticated;

create or replace function private.protect_collection_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '42501', message = 'Служебные поля подборки изменять нельзя';
  end if;
  new.name := btrim(new.name);
  new.updated_at := now();
  return new;
end
$function$;

revoke all on function private.protect_collection_update() from public, anon, authenticated;

create or replace function private.guard_collection_item_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_owner uuid;
  v_collection_items integer;
  v_total_items integer;
begin
  if not (select private.is_verified_user()) then
    raise exception using errcode = '42501', message = 'Для синхронизации подборок нужен подтверждённый аккаунт';
  end if;

  select c.user_id into v_owner
  from public.book_collections c
  where c.id = new.collection_id;

  if v_owner is null or v_owner is distinct from v_user then
    raise exception using errcode = '42501', message = 'Можно изменять только собственные подборки';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text, 913247)
  );

  select count(*) into v_collection_items
  from public.book_collection_items i
  where i.collection_id = new.collection_id;

  select count(*) into v_total_items
  from public.book_collection_items i
  join public.book_collections c on c.id = i.collection_id
  where c.user_id = v_user;

  if v_collection_items >= 100 then
    raise exception using errcode = 'P0001', message = 'Лимит: не более 100 учебников в одной подборке';
  end if;
  if v_total_items >= 500 then
    raise exception using errcode = 'P0001', message = 'Лимит: не более 500 учебников во всех подборках';
  end if;

  new.book_key := btrim(new.book_key);
  new.added_at := now();
  return new;
end
$function$;

revoke all on function private.guard_collection_item_insert() from public, anon, authenticated;

drop trigger if exists guard_solution_insert on public.solution_links;
create trigger guard_solution_insert
before insert on public.solution_links
for each row execute function private.guard_solution_insert();

drop trigger if exists protect_solution_update on public.solution_links;
create trigger protect_solution_update
before update on public.solution_links
for each row execute function private.protect_solution_update();

drop trigger if exists guard_collection_insert on public.book_collections;
create trigger guard_collection_insert
before insert on public.book_collections
for each row execute function private.guard_collection_insert();

drop trigger if exists protect_collection_update on public.book_collections;
create trigger protect_collection_update
before update on public.book_collections
for each row execute function private.protect_collection_update();

drop trigger if exists guard_collection_item_insert on public.book_collection_items;
create trigger guard_collection_item_insert
before insert on public.book_collection_items
for each row execute function private.guard_collection_item_insert();

drop policy if exists "Users create owned solutions" on public.solution_links;
create policy "Users create owned solutions"
on public.solution_links for insert to authenticated
with check (
  (select auth.uid()) = created_by
  and status = 'pending'
  and (select private.is_verified_user())
);

drop policy if exists "Users create owned collections" on public.book_collections;
create policy "Users create owned collections"
on public.book_collections for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (select private.is_verified_user())
);

drop policy if exists "Users add items to owned collections" on public.book_collection_items;
create policy "Users add items to owned collections"
on public.book_collection_items for insert to authenticated
with check (
  (select private.is_verified_user())
  and exists (
    select 1
    from public.book_collections c
    where c.id = collection_id
      and c.user_id = (select auth.uid())
  )
);
