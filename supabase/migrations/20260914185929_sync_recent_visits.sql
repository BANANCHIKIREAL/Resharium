create table public.recent_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  visit_id text not null check (char_length(visit_id) between 3 and 2200),
  kind text not null check (kind in ('book', 'solution')),
  book_key text not null check (char_length(book_key) between 1 and 200),
  url text check (url is null or (char_length(url) <= 2048 and url ~* '^https?://[^[:space:]]+$')),
  provider text check (provider is null or char_length(provider) <= 100),
  task text check (task is null or char_length(task) <= 200),
  opened_at timestamptz not null default now(),
  primary key (user_id, visit_id)
);

create index recent_visits_user_opened_idx on public.recent_visits (user_id, opened_at desc);

alter table public.recent_visits enable row level security;
revoke all on table public.recent_visits from public, anon;
grant select, insert, update, delete on table public.recent_visits to authenticated;

create policy "Users read own recent visits"
on public.recent_visits for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users insert own recent visits"
on public.recent_visits for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update own recent visits"
on public.recent_visits for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete own recent visits"
on public.recent_visits for delete to authenticated
using ((select auth.uid()) = user_id);
