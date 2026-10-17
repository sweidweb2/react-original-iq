-- Original IQ — 006: payments, logs, refunds, invoices

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
