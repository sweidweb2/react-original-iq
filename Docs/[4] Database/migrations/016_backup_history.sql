-- Original IQ — 016: backup history (metadata of each SUPER backup export; never the exported data)
-- Re-export reads type/target/format from a row and writes a new row with rerun_of set.

CREATE TABLE IF NOT EXISTS backup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(32) NOT NULL
    CHECK (type IN ('table', 'all_tables', 'storage_folder', 'storage_full', 'users')),
  target varchar(255),
  format varchar(16) NOT NULL CHECK (format IN ('csv', 'json', 'xlsx', 'sql', 'zip')),
  status varchar(16) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  filename varchar(255),
  size_bytes bigint,
  row_count integer,
  file_count integer,
  duration_ms integer,
  error text,
  requested_by uuid REFERENCES users (id) ON DELETE SET NULL,
  rerun_of uuid REFERENCES backup_history (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS backup_history_created_at_idx ON backup_history (created_at DESC);
CREATE INDEX IF NOT EXISTS backup_history_requested_by_idx ON backup_history (requested_by);

DROP TRIGGER IF EXISTS backup_history_set_updated_at ON backup_history;
CREATE TRIGGER backup_history_set_updated_at
  BEFORE UPDATE ON backup_history
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Backend uses the service-role key (bypasses RLS); no policies = no anon/authenticated access.
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;
