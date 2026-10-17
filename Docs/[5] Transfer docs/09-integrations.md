# 09 — Integrations Spec

Contracts for external systems. Keep behavior; swap vendors only with an adapter.

---

## 1. MontyPay (payments)

### Purpose

Client checkout for remaining task balance; webhook settlement; refunds (partially stubbed today).

### Config keys

- `MONTYPAY_API_URL`
- `MONTYPAY_MERCHANT_KEY`
- `MONTYPAY_MERCHANT_PASSWORD`

### Create checkout session

- Inputs: task, amount, currency, description, return/callback URLs.
- Order number format: `TASK_{taskId}_{timestamp}`.
- Hash (session):  
  `sha1(md5(upper(orderNumber + amount + currency + description + merchantPassword)))`
- Output: payment URL for redirect.

### Callback / webhook

- Accept POST from gateway.
- Require success status **and** settled order status.
- **Verify hash** before mutating DB (must be implemented).
- Idempotent on `montypay_transaction_id`.
- On success: create Payment `paid` → update task payment_status → generate invoice.

### Refunds

- Current app often records ledger refunds with synthetic IDs.
- Rebuild: either call real refund API or label as `manual_ledger`.

### Failure modes

- Gateway down → user-friendly error; no Payment row.
- Invalid hash → 4xx; log; no side effects.
- Duplicate callback → no duplicate Payment.

---

## 2. Supabase Storage (replaces Cloudflare R2)

The old app used Cloudflare R2 (`AWS_*` keys). The rebuild uses Supabase Storage through the backend service-role client.

### Config keys

- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (shared with the database)
- `SUPABASE_STORAGE_BUCKET` (`main_bucket`, private; folders `student_files/`, `solutions/`, `invoices/`)

### Operations

- upload (invoice PDFs), signed upload URL (browser uploads), info, exists, remove
- Downloads via short-lived signed URLs only; the browser never holds a Supabase key

### Failure modes

- Upload fail → transaction rollback for DB file row
- Missing object on download → 404 to user; alert ops

---

## 3. Email (SMTP / provider)

### Use cases

| Email                | Trigger                 |
| -------------------- | ----------------------- |
| Login OTP            | Admin/OTP login         |
| Password reset       | Forgot password         |
| Invoice notification | Payment success         |
| Admin custom email   | Admin broadcast/tooling |

### Config keys

Standard mail: `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`

### Failure modes

- OTP send fail → block login completion; show retry
- Invoice email fail → invoice_status `failed`; PDF still stored; allow resend

---

## 4. Gemini (public chatbot)

### Purpose

Public support chatbot grounded in site documentation.

### Config

- `GEMINI_API_KEY`
- Model historically: Gemini 2.0 Flash (verify current)

### Knowledge source

- Operator doc text (old: `storage/app/doc/web_doc.txt` / `public/doc/web_doc.txt`)

### Rules

- Do not expose admin/internal data.
- Rate limit public endpoint.
- Rebuild: consider RAG over this doc pack + public FAQ instead of one flat txt.

---

## 5. FX / currency API

### Purpose

Convert amounts for payment UI.

### Endpoint used

`https://open.er-api.com/v6/latest/{currency}`

### Rules

- Cache rates (e.g. 1 hour).
- Fallback to USD if API fails.
- Do not silently change stored accounting currency without FX snapshot.

---

## 6. PDF generation

### Use cases

- Invoice PDF
- Some admin PDF exports (leads, stay-updated)

### Notes

- Old stack: DomPDF.
- Rebuild: any HTML→PDF or template engine; keep layout fields stable for accounting.

---

## Adapter pattern (recommended)

```
PaymentGateway  → createCheckout, handleWebhook, refund
ObjectStorage   → put, get, delete, signUrl
Mailer          → send(template, to, data)
FxRates         → convert(amount, from, to)
ChatProvider    → reply(message, context)
PdfRenderer     → render(template, data) → bytes
```

Swap MontyPay/storage/Gemini without rewriting domain services.

---

## Secrets checklist

See [14-environment-and-secrets.md](./14-environment-and-secrets.md). Never commit real values.
