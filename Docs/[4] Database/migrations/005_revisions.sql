-- Original IQ — 005: revision sessions + junction

CREATE TABLE IF NOT EXISTS revision_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  start_date timestamptz,
  deadline timestamptz,
  submit_date timestamptz,
  status revision_status NOT NULL DEFAULT 'in-revision',
  title text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS revision_sessions_task_id_idx ON revision_sessions (task_id);
CREATE INDEX IF NOT EXISTS revision_sessions_status_idx ON revision_sessions (status);

DROP TRIGGER IF EXISTS revision_sessions_set_updated_at ON revision_sessions;
CREATE TRIGGER revision_sessions_set_updated_at
  BEFORE UPDATE ON revision_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS revision_session_solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_session_id uuid NOT NULL REFERENCES revision_sessions (id) ON DELETE CASCADE,
  solution_id uuid NOT NULL REFERENCES solutions (id) ON DELETE CASCADE,
  date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT revision_session_solutions_unique UNIQUE (revision_session_id, solution_id)
);

CREATE INDEX IF NOT EXISTS revision_session_solutions_session_idx
  ON revision_session_solutions (revision_session_id);
CREATE INDEX IF NOT EXISTS revision_session_solutions_solution_idx
  ON revision_session_solutions (solution_id);

DROP TRIGGER IF EXISTS revision_session_solutions_set_updated_at ON revision_session_solutions;
CREATE TRIGGER revision_session_solutions_set_updated_at
  BEFORE UPDATE ON revision_session_solutions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
