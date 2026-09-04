create table if not exists public.textbooks (
  id text primary key check (char_length(id) between 1 and 120),
  grade smallint not null check (grade between 1 and 11),
  subject text not null check (char_length(subject) between 1 and 80),
  title text not null check (char_length(title) between 1 and 180),
  author text not null default '' check (char_length(author) <= 300),
  year smallint check (year between 1900 and 2100),
  cover_url text check (cover_url is null or (char_length(cover_url) <= 2048 and cover_url ~ '^https://')),
  source_url text not null unique check (char_length(source_url) <= 2048 and source_url ~ '^https://'),
  source_name text not null default 'Решёба' check (char_length(source_name) between 1 and 80),
  active boolean not null default true,
  popular boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists textbooks_grade_subject_idx
  on public.textbooks (grade, subject)
  where active;

alter table public.textbooks enable row level security;

drop policy if exists "Active textbooks are public" on public.textbooks;
create policy "Active textbooks are public"
  on public.textbooks for select
  to anon, authenticated
  using (active);

revoke all on table public.textbooks from anon, authenticated;
grant select on table public.textbooks to anon, authenticated;

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_key text not null references public.textbooks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_key)
);

alter table public.user_favorites enable row level security;

drop policy if exists "Users read own favorites" on public.user_favorites;
create policy "Users read own favorites"
  on public.user_favorites for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Verified users add own favorites" on public.user_favorites;
create policy "Verified users add own favorites"
  on public.user_favorites for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select private.is_verified_user())
  );

drop policy if exists "Users delete own favorites" on public.user_favorites;
create policy "Users delete own favorites"
  on public.user_favorites for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_favorites from anon, authenticated;
grant select, insert, delete on table public.user_favorites to authenticated;
