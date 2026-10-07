-- Original IQ — 010: optional / legacy tables (skip if unused)
-- messages, assignment_transactions

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject varchar(255),
  content text NOT NULL,
  status message_status NOT NULL DEFAULT 'unread',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON messages (receiver_id);
CREATE INDEX IF NOT EXISTS messages_status_idx ON messages (status);

DROP TRIGGER IF EXISTS messages_set_updated_at ON messages;
CREATE TRIGGER messages_set_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assignment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  coordinator_id uuid REFERENCES users (id) ON DELETE SET NULL,
  tutor_id uuid REFERENCES users (id) ON DELETE SET NULL,
  type assignment_transaction_type NOT NULL,
  date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignment_transactions_task_id_idx ON assignment_transactions (task_id);
CREATE INDEX IF NOT EXISTS assignment_transactions_type_idx ON assignment_transactions (type);

DROP TRIGGER IF EXISTS assignment_transactions_set_updated_at ON assignment_transactions;
CREATE TRIGGER assignment_transactions_set_updated_at
  BEFORE UPDATE ON assignment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
