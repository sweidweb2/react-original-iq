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
