?-- Original IQ — full schema (001→010). Paste into Supabase SQL Editor → Run
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




-- ========== 011_rbac.sql ==========

-- Original IQ â€” 011: RBAC catalog (roles, permissions, assignments)
-- Runtime auth still uses users.role; these tables are the editable matrix.

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(64) NOT NULL,
  name varchar(120) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_key_unique UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS roles_sort_order_idx ON roles (sort_order);

DROP TRIGGER IF EXISTS roles_set_updated_at ON roles;
CREATE TRIGGER roles_set_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(80) NOT NULL,
  name varchar(120) NOT NULL,
  description text,
  category varchar(64) NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissions_key_unique UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS permissions_category_idx ON permissions (category);

DROP TRIGGER IF EXISTS permissions_set_updated_at ON permissions;
CREATE TRIGGER permissions_set_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS role_permissions_permission_id_idx ON role_permissions (permission_id);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS user_permissions_permission_id_idx ON user_permissions (permission_id);


-- ========== 012_activity_logs_and_super.sql ==========
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


-- ========== 013_file_metadata.sql ==========
-- Original IQ — 013: file/solution upload metadata (store object key + meta)
-- file_location / solutions.file_location remain the private object key (not a public URL).

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS original_name varchar(255),
  ADD COLUMN IF NOT EXISTS content_type varchar(120),
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

ALTER TABLE solutions
  ADD COLUMN IF NOT EXISTS original_name varchar(255),
  ADD COLUMN IF NOT EXISTS content_type varchar(120),
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

COMMENT ON COLUMN files.file_location IS 'R2 object key (e.g. student_files/{taskId}/{uuid}_name.pdf)';
COMMENT ON COLUMN solutions.file_location IS 'R2 object key (e.g. solutions/{taskId}/{uuid}_name.pdf)';


-- ========== 014_invoices.sql ==========
-- Original IQ — 014: invoice numbering + delivery tracking
-- invoice_number = 'INV-' || lpad(invoice_seq, 6, '0')  (doc 06: INV-000123)

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_seq bigint NOT NULL DEFAULT nextval('invoice_number_seq'),
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER SEQUENCE invoice_number_seq OWNED BY invoices.invoice_seq;

-- Normalize any legacy rows created before numbering existed.
UPDATE invoices
SET invoice_number = 'INV-' || lpad(invoice_seq::text, 6, '0')
WHERE invoice_number IS NULL OR invoice_number NOT LIKE 'INV-______';

CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_seq_unique ON invoices (invoice_seq);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_number_unique ON invoices (invoice_number);

COMMENT ON COLUMN invoices.pdf_path IS 'R2 object key under invoices/ (signed URL at download time)';
COMMENT ON COLUMN invoices.invoice_status IS 'sent when PDF stored and email delivered; failed otherwise (resend allowed)';

-- ========== 015_auth_sessions.sql ==========
-- Original IQ — 015: auth sessions (refresh tokens bound to a revocable, fixed-lifetime session)
-- A session starts at login/register and dies at expires_at (JWT_REFRESH_EXPIRES_IN, default 7d).
-- Refreshing never extends it. Logout revokes one session; password reset revokes all.

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions (expires_at);

DROP TRIGGER IF EXISTS auth_sessions_set_updated_at ON auth_sessions;
CREATE TRIGGER auth_sessions_set_updated_at
  BEFORE UPDATE ON auth_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Backend uses the service-role key (bypasses RLS); no policies = no anon/authenticated access.
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- ========== 016_backup_history.sql ==========
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

-- ========== 017_error_logs_source.sql ==========
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

-- ========== 018_feedback_unique.sql ==========
-- Original IQ — 018: one feedback per client per task
-- Removes older duplicates (keeps the newest row per task/client) before adding the unique index.

DELETE FROM feedbacks f
USING feedbacks newer
WHERE f.task_id = newer.task_id
  AND f.client_id = newer.client_id
  AND (f.created_at, f.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS feedbacks_task_client_unique ON feedbacks (task_id, client_id);

-- ========== 019_auth_hardening.sql ==========
-- Original IQ — 019: reset-code brute-force limits + shared rate-limit counters
-- 1) login_verifications.code now holds sha256(code) hex; `attempts` counts wrong guesses and the
--    code is burned after the limit. Codes issued before this migration stop matching (10 min TTL).
-- 2) rate_limit_hits backs express-rate-limit for auth routes so limits hold across Vercel instances.
-- Functions are callable only with the service-role key.

ALTER TABLE login_verifications ALTER COLUMN code TYPE varchar(64);
ALTER TABLE login_verifications ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION login_verification_register_failure(p_id uuid, p_max_attempts integer)
RETURNS integer
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE login_verifications
  SET attempts = attempts + 1,
      used = used OR attempts + 1 >= p_max_attempts,
      used_at = CASE WHEN attempts + 1 >= p_max_attempts THEN now() ELSE used_at END
  WHERE id = p_id
  RETURNING attempts;
$$;

REVOKE ALL ON FUNCTION login_verification_register_failure(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION login_verification_register_failure(uuid, integer) TO service_role;

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  key text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_reset_at_idx ON rate_limit_hits (reset_at);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION rate_limit_hit(p_key text, p_window_ms integer)
RETURNS TABLE (hits integer, reset_at timestamptz)
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO rate_limit_hits AS r (key, hits, reset_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0))
  ON CONFLICT (key) DO UPDATE
  SET hits = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.hits + 1 END,
      reset_at = CASE WHEN r.reset_at <= now() THEN EXCLUDED.reset_at ELSE r.reset_at END
  RETURNING r.hits, r.reset_at;
$$;

CREATE OR REPLACE FUNCTION rate_limit_decrement(p_key text)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE rate_limit_hits SET hits = greatest(hits - 1, 0) WHERE key = p_key;
$$;

REVOKE ALL ON FUNCTION rate_limit_hit(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rate_limit_decrement(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rate_limit_hit(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION rate_limit_decrement(text) TO service_role;

-- ========== 020_money_integrity.sql ==========
-- Original IQ — 020: money integrity (USD-only ledger + atomic payment/refund writes)
-- 1) Totals are summed without conversion, so every payment/refund row must be USD.
-- 2) Payment and refund writes lock the task row (SELECT … FOR UPDATE) and re-check the caps
--    inside the same transaction, so concurrent requests cannot overpay or over-refund a task.
--    Errors are raised with messages OVERPAY / REFUND_CAP / REFUND_UNCOVERED / TASK_NOT_FOUND /
--    PAYMENT_NOT_FOUND (SQLSTATE P0001), which the backend maps to 400/404.
-- Functions are callable only with the service-role key.

UPDATE payments SET currency = 'USD' WHERE currency <> 'USD';
UPDATE refunds SET currency = 'USD' WHERE currency <> 'USD';

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_currency_usd_check;
ALTER TABLE payments ADD CONSTRAINT payments_currency_usd_check CHECK (currency = 'USD');
ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_currency_usd_check;
ALTER TABLE refunds ADD CONSTRAINT refunds_currency_usd_check CHECK (currency = 'USD');

CREATE OR REPLACE FUNCTION task_money_totals(
  p_task_id uuid,
  OUT paid_payments numeric,
  OUT paid_refunds numeric,
  OUT pending_refunds numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    coalesce((SELECT sum(amount) FROM payments WHERE task_id = p_task_id AND status = 'paid'), 0),
    coalesce((SELECT sum(amount) FROM refunds WHERE task_id = p_task_id AND status = 'paid'), 0),
    coalesce((SELECT sum(amount) FROM refunds WHERE task_id = p_task_id AND status = 'pending'), 0);
$$;

CREATE OR REPLACE FUNCTION create_task_payment(
  p_task_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_status payment_status,
  p_gateway varchar,
  p_method varchar,
  p_txn_id varchar,
  p_max_net numeric
)
RETURNS SETOF payments
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_totals record;
  v_row payments;
BEGIN
  PERFORM 1 FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  IF p_status = 'paid' THEN
    SELECT * INTO v_totals FROM task_money_totals(p_task_id);
    IF v_totals.paid_payments - v_totals.paid_refunds + p_amount > p_max_net + 0.005 THEN
      RAISE EXCEPTION 'OVERPAY';
    END IF;
  END IF;

  INSERT INTO payments (
    task_id, user_id, amount, currency, gateway, status, payment_method, montypay_transaction_id
  )
  VALUES (p_task_id, p_user_id, p_amount, 'USD', p_gateway, p_status, p_method, p_txn_id)
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

-- p_amount / p_status NULL = keep current; p_set_method distinguishes "clear method" from "keep".
CREATE OR REPLACE FUNCTION update_task_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_status payment_status,
  p_set_method boolean,
  p_method varchar,
  p_max_net numeric
)
RETURNS SETOF payments
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current payments;
  v_totals record;
  v_next_amount numeric;
  v_next_status payment_status;
  v_others numeric;
  v_next_paid numeric;
  v_row payments;
BEGIN
  SELECT * INTO v_current FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND';
  END IF;

  PERFORM 1 FROM tasks WHERE id = v_current.task_id FOR UPDATE;
  SELECT * INTO v_current FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND';
  END IF;

  v_next_amount := coalesce(p_amount, v_current.amount);
  v_next_status := coalesce(p_status, v_current.status);

  SELECT * INTO v_totals FROM task_money_totals(v_current.task_id);
  v_others := v_totals.paid_payments
    - CASE WHEN v_current.status = 'paid' THEN v_current.amount ELSE 0 END;

  IF v_next_status = 'paid'
    AND v_others + v_next_amount - v_totals.paid_refunds > p_max_net + 0.005 THEN
    RAISE EXCEPTION 'OVERPAY';
  END IF;

  -- PL/pgSQL ends an IF condition at the first THEN, so a CASE cannot appear inside it.
  v_next_paid := v_others + CASE WHEN v_next_status = 'paid' THEN v_next_amount ELSE 0 END;
  IF v_next_paid < v_totals.paid_payments
    AND v_next_paid < v_totals.paid_refunds + v_totals.pending_refunds - 0.005 THEN
    RAISE EXCEPTION 'REFUND_UNCOVERED';
  END IF;

  UPDATE payments
  SET amount = v_next_amount,
      status = v_next_status,
      payment_method = CASE WHEN p_set_method THEN p_method ELSE payment_method END
  WHERE id = p_payment_id
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

CREATE OR REPLACE FUNCTION create_task_refund(
  p_task_id uuid,
  p_refunder_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS SETOF refunds
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_totals record;
  v_row refunds;
BEGIN
  PERFORM 1 FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  SELECT * INTO v_totals FROM task_money_totals(p_task_id);
  IF p_amount > v_totals.paid_payments - v_totals.paid_refunds - v_totals.pending_refunds + 0.005 THEN
    RAISE EXCEPTION 'REFUND_CAP';
  END IF;

  INSERT INTO refunds (
    task_id, refunder_id, amount, refund_reason, currency, gateway, status, payment_method
  )
  VALUES (p_task_id, p_refunder_id, p_amount, p_reason, 'USD', 'manual', 'pending', 'manual')
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

REVOKE ALL ON FUNCTION task_money_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_task_payment(uuid, uuid, numeric, payment_status, varchar, varchar, varchar, numeric)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION update_task_payment(uuid, numeric, payment_status, boolean, varchar, numeric)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_task_refund(uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION task_money_totals(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION create_task_payment(uuid, uuid, numeric, payment_status, varchar, varchar, varchar, numeric)
  TO service_role;
GRANT EXECUTE ON FUNCTION update_task_payment(uuid, numeric, payment_status, boolean, varchar, numeric)
  TO service_role;
GRANT EXECUTE ON FUNCTION create_task_refund(uuid, uuid, numeric, text) TO service_role;

-- ========== 021_revision_open_unique.sql ==========
-- Original IQ — 021: at most one open revision session per task
-- Cancels older duplicate open sessions (keeps the newest per task) before adding the partial unique index.

UPDATE revision_sessions r
SET status = 'cancelled'
WHERE r.status IN ('in-revision', 'waiting_coordinator_approval')
  AND EXISTS (
    SELECT 1
    FROM revision_sessions newer
    WHERE newer.task_id = r.task_id
      AND newer.status IN ('in-revision', 'waiting_coordinator_approval')
      AND (newer.created_at, newer.id) > (r.created_at, r.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS revision_sessions_one_open_per_task
  ON revision_sessions (task_id)
  WHERE status IN ('in-revision', 'waiting_coordinator_approval');

-- ========== 022_financial_fk_restrict.sql ==========
-- Original IQ — 022: never cascade-delete financial records
-- Deleting a client no longer cascades to their tasks, and deleting a task no longer cascades to its
-- payments/refunds (and, through payments, invoices). The backend deletes payment-free tasks explicitly
-- and answers 409 when a foreign key blocks a delete.

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_client_id_fkey;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_task_id_fkey;
ALTER TABLE payments
  ADD CONSTRAINT payments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE RESTRICT;

ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_task_id_fkey;
ALTER TABLE refunds
  ADD CONSTRAINT refunds_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE RESTRICT;

-- ========== 023_settings.sql ==========
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

-- ========== 024_task_counters.sql ==========
-- Original IQ — 024: atomic task counters
-- increment_user_nb_done: single-statement nb_done += 1, so concurrent approvals cannot lose a count.
-- coordinator_active_task_counts: open-task load per coordinator (pending / in-progress /
-- waiting_coordinator_approval) in one grouped query, used by coordinator auto-assignment.
-- Functions are callable only with the service-role key.

CREATE OR REPLACE FUNCTION increment_user_nb_done(p_user_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE users SET nb_done = nb_done + 1 WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION coordinator_active_task_counts(p_coordinator_ids uuid[])
RETURNS TABLE (coordinator_id uuid, active_count integer)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT t.coordinator_id, count(*)::integer
  FROM tasks t
  WHERE t.coordinator_id = ANY (p_coordinator_ids)
    AND t.status IN ('pending', 'in-progress', 'waiting_coordinator_approval')
  GROUP BY t.coordinator_id;
$$;

REVOKE ALL ON FUNCTION increment_user_nb_done(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION coordinator_active_task_counts(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_user_nb_done(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION coordinator_active_task_counts(uuid[]) TO service_role;

-- ========== 025_invoice_void_and_number.sql ==========
-- Original IQ - 025: invoices are voided, never deleted; invoice_number is generated
-- 1) invoice_number is GENERATED from invoice_seq (one insert, never NULL): 'INV-' + seq zero-padded
--    to 6 digits; past 999999 it grows instead of being truncated by lpad.
-- 2) Each invoice keeps the amount/currency it billed, so a voided invoice still shows what it said.
-- 3) Editing or canceling a paid payment voids its invoice (voided_at, void_reason) and the backend
--    issues a new one; at most one non-voided invoice per payment.
-- 4) A payment with invoices can no longer be deleted (FK RESTRICT instead of CASCADE).

-- 1) generated invoice number
DROP INDEX IF EXISTS invoices_invoice_number_unique;
DROP INDEX IF EXISTS invoices_invoice_number_idx;
ALTER TABLE invoices DROP COLUMN IF EXISTS invoice_number;
ALTER TABLE invoices
  ADD COLUMN invoice_number varchar(32) NOT NULL GENERATED ALWAYS AS (
    'INV-' || CASE
      WHEN invoice_seq < 1000000 THEN lpad(invoice_seq::text, 6, '0')
      ELSE invoice_seq::text
    END
  ) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_number_unique ON invoices (invoice_number);

-- 2) billed amount snapshot
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS amount numeric(10, 2),
  ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'USD';

UPDATE invoices AS i
SET amount = p.amount, currency = p.currency
FROM payments AS p
WHERE p.id = i.payment_id AND i.amount IS NULL;

ALTER TABLE invoices ALTER COLUMN amount SET NOT NULL;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_currency_usd_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_currency_usd_check CHECK (currency = 'USD');

-- 3) voiding
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_id_key;
CREATE INDEX IF NOT EXISTS invoices_payment_id_idx ON invoices (payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_payment_active_unique
  ON invoices (payment_id)
  WHERE voided_at IS NULL;

-- 4) keep invoices when someone tries to delete their payment
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_id_fkey;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE RESTRICT;

COMMENT ON COLUMN invoices.invoice_number IS 'Generated: INV- + invoice_seq zero-padded to at least 6 digits';
COMMENT ON COLUMN invoices.amount IS 'Amount billed by this invoice (snapshot of the payment at issue time)';
COMMENT ON COLUMN invoices.voided_at IS 'Set when the payment was edited or canceled; voided invoices are kept';
