-- Original IQ — 017: error log source / level / meta (unexpected failures from any backend catch)
-- source = where it failed (http, invoices.issue, process.unhandledRejection, …).

ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS source varchar(80);
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS level varchar(16) NOT NULL DEFAULT 'error';
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS meta jsonb;

ALTER TABLE error_logs DROP CONSTRAINT IF EXISTS error_logs_level_check;
ALTER TABLE error_logs
  ADD CONSTRAINT error_logs_level_check CHECK (level IN ('error', 'warning'));

UPDATE error_logs SET source = 'http' WHERE source IS NULL;

CREATE INDEX IF NOT EXISTS error_logs_source_idx ON error_logs (source);
CREATE INDEX IF NOT EXISTS error_logs_level_idx ON error_logs (level);
