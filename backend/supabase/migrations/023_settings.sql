-- Original IQ — 023: platform settings (single row, managed by SUPER)
-- maintenance_mode: only SUPER users may sign in or call the API while true.
-- emails_send: outgoing emails are logged instead of sent while false.

CREATE TABLE IF NOT EXISTS settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode boolean NOT NULL DEFAULT false,
  emails_send boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS settings_set_updated_at ON settings;
CREATE TRIGGER settings_set_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Backend uses the service-role key (bypasses RLS); no policies = no anon/authenticated access.
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
