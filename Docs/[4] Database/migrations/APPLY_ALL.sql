-- Original IQ — full schema (001→010). Paste into Supabase SQL Editor → Run
-- Generated for one-shot apply. Prefer numbered files for incremental runs.

-- ========== 001_extensions_and_enums.sql ==========
-- Original IQ â€” 001: extensions + enums
-- Apply in order via Supabase SQL Editor or `supabase db push`

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helpers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'coordinator', 'tutor', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('assignment', 'tutoring', 'research', 'editing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'pending',
    'in-progress',
    'waiting_coordinator_approval',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_payment_status AS ENUM ('unpaid', 'paid', 'refund_pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE revision_status AS ENUM (
    'in-revision',
    'waiting_coordinator_approval',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'canceled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE login_verification_type AS ENUM ('email', 'password_reset');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_transaction_type AS ENUM (
    'assigned',
    'reassigned',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('unread', 'read');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ========== 002_users.sql ==========
-- Original IQ â€” 002: users

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  email varchar(255) NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  phone varchar(40),
  email_verified boolean NOT NULL DEFAULT false,
  email_verified_at timestamptz,
  permissions jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  nb_done integer NOT NULL DEFAULT 0,
  punctuality numeric(5, 2) NOT NULL DEFAULT 0,
  quality numeric(5, 2) NOT NULL DEFAULT 0,
  perfection numeric(5, 2) NOT NULL DEFAULT 0,
  avg_rating_star numeric(3, 2) NOT NULL DEFAULT 0,
  start_date date,
  remember_token varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users (is_active);

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ========== 003_tasks.sql ==========
-- Original IQ â€” 003: tasks

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


-- ========== 004_files_and_solutions.sql ==========
-- Original IQ â€” 004: client files + tutor solutions

CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  file_location text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS files_task_id_idx ON files (task_id);

DROP TRIGGER IF EXISTS files_set_updated_at ON files;
CREATE TRIGGER files_set_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  file_location text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS solutions_task_id_idx ON solutions (task_id);

DROP TRIGGER IF EXISTS solutions_set_updated_at ON solutions;
CREATE TRIGGER solutions_set_updated_at
  BEFORE UPDATE ON solutions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ========== 005_revisions.sql ==========
-- Original IQ â€” 005: revision sessions + junction

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


-- ========== 006_payments.sql ==========
-- Original IQ â€” 006: payments, logs, refunds, invoices

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  amount numeric(10, 2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  gateway varchar(64) NOT NULL DEFAULT 'montypay',
  montypay_transaction_id varchar(128),
  status payment_status NOT NULL DEFAULT 'pending',
  payment_url text,
  payment_method varchar(64),
  callback_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_montypay_transaction_id_unique UNIQUE (montypay_transaction_id)
);

CREATE INDEX IF NOT EXISTS payments_task_id_idx ON payments (task_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);

DROP TRIGGER IF EXISTS payments_set_updated_at ON payments;
CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
  event varchar(120) NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_logs_payment_id_idx ON payment_logs (payment_id);

DROP TRIGGER IF EXISTS payment_logs_set_updated_at ON payment_logs;
CREATE TRIGGER payment_logs_set_updated_at
  BEFORE UPDATE ON payment_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  refunder_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  amount numeric(10, 2) NOT NULL,
  refund_reason text,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  gateway varchar(64) NOT NULL,
  montypay_transaction_id varchar(128),
  status payment_status NOT NULL DEFAULT 'pending',
  payment_url text,
  payment_method varchar(64),
  callback_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refunds_task_id_idx ON refunds (task_id);
CREATE INDEX IF NOT EXISTS refunds_refunder_id_idx ON refunds (refunder_id);
CREATE INDEX IF NOT EXISTS refunds_status_idx ON refunds (status);

DROP TRIGGER IF EXISTS refunds_set_updated_at ON refunds;
CREATE TRIGGER refunds_set_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE REFERENCES payments (id) ON DELETE CASCADE,
  invoice_number varchar(32),
  invoice_date timestamptz,
  invoice_status invoice_status,
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_invoice_number_idx ON invoices (invoice_number);

DROP TRIGGER IF EXISTS invoices_set_updated_at ON invoices;
CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ========== 007_feedback_and_specializations.sql ==========
-- Original IQ â€” 007: feedbacks + tutor specializations

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


-- ========== 008_leads_and_contact.sql ==========
-- Original IQ â€” 008: leads, newsletter, contact messages

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name varchar(80),
  last_name varchar(80),
  phone varchar(40),
  email varchar(255),
  country varchar(80),
  zip varchar(20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);

DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS stay_updated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stay_updated_email_unique UNIQUE (email)
);

DROP TRIGGER IF EXISTS stay_updated_set_updated_at ON stay_updated;
CREATE TRIGGER stay_updated_set_updated_at
  BEFORE UPDATE ON stay_updated
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  email varchar(255) NOT NULL,
  subject varchar(255),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_email_idx ON contact_messages (email);

DROP TRIGGER IF EXISTS contact_messages_set_updated_at ON contact_messages;
CREATE TRIGGER contact_messages_set_updated_at
  BEFORE UPDATE ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ========== 009_login_security.sql ==========
-- Original IQ â€” 009: login attempts + email/password verification codes

CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  ip_address varchar(45) NOT NULL,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_email_ip_idx ON login_attempts (email, ip_address);
CREATE INDEX IF NOT EXISTS login_attempts_locked_until_idx ON login_attempts (locked_until);

DROP TRIGGER IF EXISTS login_attempts_set_updated_at ON login_attempts;
CREATE TRIGGER login_attempts_set_updated_at
  BEFORE UPDATE ON login_attempts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS login_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code varchar(6) NOT NULL,
  type login_verification_type NOT NULL DEFAULT 'email',
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_verifications_user_id_idx ON login_verifications (user_id);
CREATE INDEX IF NOT EXISTS login_verifications_code_idx ON login_verifications (code);
CREATE INDEX IF NOT EXISTS login_verifications_expires_at_idx ON login_verifications (expires_at);

DROP TRIGGER IF EXISTS login_verifications_set_updated_at ON login_verifications;
CREATE TRIGGER login_verifications_set_updated_at
  BEFORE UPDATE ON login_verifications
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ========== 010_legacy_optional.sql ==========
-- Original IQ â€” 010: optional / legacy tables (skip if unused)
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


