-- Original IQ — 018: one feedback per client per task
-- Removes older duplicates (keeps the newest row per task/client) before adding the unique index.

DELETE FROM feedbacks f
USING feedbacks newer
WHERE f.task_id = newer.task_id
  AND f.client_id = newer.client_id
  AND (f.created_at, f.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS feedbacks_task_client_unique ON feedbacks (task_id, client_id);
