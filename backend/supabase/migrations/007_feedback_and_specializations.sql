-- Original IQ — 007: feedbacks + tutor specializations

CREATE TABLE IF NOT EXISTS feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  rating integer CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  comments text,
  suggestions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedbacks_task_id_idx ON feedbacks (task_id);
CREATE INDEX IF NOT EXISTS feedbacks_tutor_id_idx ON feedbacks (tutor_id);
CREATE INDEX IF NOT EXISTS feedbacks_client_id_idx ON feedbacks (client_id);

DROP TRIGGER IF EXISTS feedbacks_set_updated_at ON feedbacks;
CREATE TRIGGER feedbacks_set_updated_at
  BEFORE UPDATE ON feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS specializations_tutor_id_idx ON specializations (tutor_id);

DROP TRIGGER IF EXISTS specializations_set_updated_at ON specializations;
CREATE TRIGGER specializations_set_updated_at
  BEFORE UPDATE ON specializations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
