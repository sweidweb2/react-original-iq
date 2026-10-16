-- Original IQ — 003: tasks

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tutor_id uuid REFERENCES users (id) ON DELETE SET NULL,
  coordinator_id uuid REFERENCES users (id) ON DELETE SET NULL,
  topic varchar(255),
  type task_type,
  description text,
  is_assigned boolean NOT NULL DEFAULT false,
  status task_status NOT NULL DEFAULT 'pending',
  deadline timestamptz,
  price numeric(8, 2) NOT NULL DEFAULT 0,
  payment_status task_payment_status NOT NULL DEFAULT 'unpaid',
  category varchar(120),
  feedback text,
  allow_view boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_client_id_idx ON tasks (client_id);
CREATE INDEX IF NOT EXISTS tasks_tutor_id_idx ON tasks (tutor_id);
CREATE INDEX IF NOT EXISTS tasks_coordinator_id_idx ON tasks (coordinator_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);
CREATE INDEX IF NOT EXISTS tasks_payment_status_idx ON tasks (payment_status);
CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON tasks (deadline);

DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
