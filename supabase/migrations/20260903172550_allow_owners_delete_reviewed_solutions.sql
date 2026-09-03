drop policy if exists "Users delete owned solutions" on public.solution_links;
create policy "Users delete owned solutions"
on public.solution_links for delete to authenticated
using (
  (select auth.uid()) = created_by
  or (select private.is_admin())
);
