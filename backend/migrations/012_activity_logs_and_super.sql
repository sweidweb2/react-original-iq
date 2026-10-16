-- Original IQ — 012: activity/error logs + user_role.super

-- Add super to the runtime role enum (idempotent)
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE 'super';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity varchar(80),
  entity_id varchar(80),
  meta jsonb,
  ip varchar(45),
  request_id varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs (action);

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id varchar(64),
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  code varchar(80),
  message text NOT NULL,
  stack text,
  path text,
  method varchar(16),
  status integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_user_id_idx ON error_logs (user_id);
CREATE INDEX IF NOT EXISTS error_logs_status_idx ON error_logs (status);
