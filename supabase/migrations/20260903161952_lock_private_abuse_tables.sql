drop policy if exists "No direct client access" on private.solution_submission_events;
create policy "No direct client access"
on private.solution_submission_events for all to authenticated
using (false)
with check (false);

drop policy if exists "No direct client access" on private.blocked_users;
create policy "No direct client access"
on private.blocked_users for all to authenticated
using (false)
with check (false);
