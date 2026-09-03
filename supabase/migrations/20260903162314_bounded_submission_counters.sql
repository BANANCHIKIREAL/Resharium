-- Keep rate-limit state bounded to one short row per account.
-- A timestamp array preserves rolling 1-hour and 24-hour limits without an
-- ever-growing event log.

create table if not exists private.solution_submission_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  submitted_at timestamptz[] not null default '{}'::timestamptz[],
  updated_at timestamptz not null default now(),
  constraint solution_submission_limits_max_events
    check (cardinality(submitted_at) <= 20)
);

alter table private.solution_submission_limits enable row level security;
revoke all on table private.solution_submission_limits from public, anon, authenticated;

drop policy if exists "No direct client access" on private.solution_submission_limits;
create policy "No direct client access"
on private.solution_submission_limits for all to authenticated
using (false)
with check (false);

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

    select coalesce(
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

drop table if exists private.solution_submission_events;
