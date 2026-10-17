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
