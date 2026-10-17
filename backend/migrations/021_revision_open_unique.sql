-- Original IQ — 021: at most one open revision session per task
-- Cancels older duplicate open sessions (keeps the newest per task) before adding the partial unique index.

UPDATE revision_sessions r
SET status = 'cancelled'
WHERE r.status IN ('in-revision', 'waiting_coordinator_approval')
  AND EXISTS (
    SELECT 1
    FROM revision_sessions newer
    WHERE newer.task_id = r.task_id
      AND newer.status IN ('in-revision', 'waiting_coordinator_approval')
      AND (newer.created_at, newer.id) > (r.created_at, r.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS revision_sessions_one_open_per_task
  ON revision_sessions (task_id)
  WHERE status IN ('in-revision', 'waiting_coordinator_approval');
