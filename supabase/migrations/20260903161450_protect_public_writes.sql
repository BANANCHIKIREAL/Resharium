-- Server-side abuse protection for all public write paths.
-- Limits are enforced in Postgres, so modifying the desktop client cannot bypass them.

create table if not exists private.solution_submission_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists private.blocked_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null default 'spam' check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table private.solution_submission_events enable row level security;
alter table private.blocked_users enable row level security;
revoke all on table private.solution_submission_events from public, anon, authenticated;
revoke all on table private.blocked_users from public, anon, authenticated;
revoke all on sequence private.solution_submission_events_id_seq from public, anon, authenticated;

create index if not exists solution_submission_events_user_created_idx
  on private.solution_submission_events (user_id, created_at desc);

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
  v_hour_count integer;
  v_day_count integer;
  v_pending_count integer;
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
    select
      count(*) filter (where e.created_at >= now() - interval '1 hour'),
      count(*),
      (
        select count(*)
        from public.solution_links s
        where s.created_by = v_user
          and s.status = 'pending'
      )
    into v_hour_count, v_day_count, v_pending_count
    from private.solution_submission_events e
    where e.user_id = v_user
      and e.created_at >= now() - interval '24 hours';

    if v_hour_count >= 5 then
      raise exception using errcode = 'P0001', message = 'Лимит: не более 5 ссылок в час';
    end if;
    if v_day_count >= 20 then
      raise exception using errcode = 'P0001', message = 'Лимит: не более 20 ссылок в сутки';
    end if;
    if v_pending_count >= 50 then
      raise exception using errcode = 'P0001', message = 'Сначала дождитесь проверки ранее отправленных ссылок';
    end if;

    insert into private.solution_submission_events (user_id) values (v_user);
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
