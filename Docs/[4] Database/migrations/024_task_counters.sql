-- Original IQ — 024: atomic task counters
-- increment_user_nb_done: single-statement nb_done += 1, so concurrent approvals cannot lose a count.
-- coordinator_active_task_counts: open-task load per coordinator (pending / in-progress /
-- waiting_coordinator_approval) in one grouped query, used by coordinator auto-assignment.
-- Functions are callable only with the service-role key.

CREATE OR REPLACE FUNCTION increment_user_nb_done(p_user_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE users SET nb_done = nb_done + 1 WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION coordinator_active_task_counts(p_coordinator_ids uuid[])
RETURNS TABLE (coordinator_id uuid, active_count integer)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT t.coordinator_id, count(*)::integer
  FROM tasks t
  WHERE t.coordinator_id = ANY (p_coordinator_ids)
    AND t.status IN ('pending', 'in-progress', 'waiting_coordinator_approval')
  GROUP BY t.coordinator_id;
$$;

REVOKE ALL ON FUNCTION increment_user_nb_done(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION coordinator_active_task_counts(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_user_nb_done(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION coordinator_active_task_counts(uuid[]) TO service_role;
