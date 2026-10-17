# 06 — Payments, Refunds & Invoices Spec

## Core formula

For a task:

```
totalPayments = SUM(payments.amount)     // typically status paid; confirm which statuses count
totalRefunds  = SUM(refunds.amount)      // typically status paid
net           = totalPayments - totalRefunds
```

### Task `payment_status` derivation

| Condition           | payment_status   |
| ------------------- | ---------------- |
| `net == task.price` | `paid`           |
| `net > task.price`  | `refund_pending` |
| else                | `unpaid`         |

### Helpers

```
amountStillNeeded = price - totalPayments + totalRefunds
overpayAmount     = (totalPayments - totalRefunds) - price   // when net > price
```

Recompute after: client gateway payment, admin manual payment, payment delete, refund create, price edit.

---

## Payment entity rules

**Statuses:** `pending` | `paid` | `failed` | `canceled` | `refunded`

**Client gateway pay**

1. Actor must be the task’s `client_id`.
2. Amount ≥ 0.01; currency (≤ 3 chars, usually USD).
3. Block if `net >= price` (nothing due).
4. Create checkout session with order number: `TASK_{taskId}_{timestamp}`.
5. Redirect client to gateway URL.
6. On success callback:
   - Require gateway success + settled order status.
   - Verify callback authenticity (hash) — **implement correctly** (old service references `verifyHash` but it was missing).
   - **Idempotent** on `montypay_transaction_id`.
   - Insert Payment with status `paid`.
   - Update task `payment_status`.
   - Generate invoice + email.

**Admin manual payment**

1. Amount ≥ 0, ≤ 2 decimal places.
2. Block if `net >= price`.
3. Block creating overpay beyond price (admin path is strict).
4. Gateway label: `No Gateway`; status `paid`.
5. Generate invoice.

**Admin delete payment:** reverse money effect; recompute `payment_status`; handle linked invoice carefully.

---

## Refund rules

**Create refund (admin; coordinator limited path)**

1. Amount ≥ 0.01 (+ reason where required).
2. Respect caps: cannot refund more than makes sense vs overpay / net rules (`adminPayRefund` guards).
3. Record Refund with status `paid` (current app often stubs gateway IDs — decide real gateway refund vs ledger-only).
4. Recompute task `payment_status` (often → `unpaid` or leave `paid` depending on net).

**Overpay case:** when `net > price`, `payment_status = refund_pending` until refunds bring net down to price.

---

## Invoices

Triggered after successful paid Payment (gateway or manual).

| Field          | Rule                                                 |
| -------------- | ---------------------------------------------------- |
| invoice_number | `INV-` + payment id zero-padded to 6 (`INV-000123`)  |
| invoice_date   | now                                                  |
| pdf_path       | e.g. `invoices/invoice_000123.pdf` on object storage |
| invoice_status | `sent` if email+PDF ok, else `failed`                |

**Side effects**

1. Render PDF (invoice template).
2. Store PDF in object storage.
3. Email client with invoice notification.
4. Persist Invoice row linked to Payment.

---

## Currency

- Base accounting currency: **USD** (default on Payment/Refund).
- UI may convert via FX API for display/checkout currency selection.
- Rebuild: decide if multi-currency amounts are stored as-charged or always converted to USD first (old app leans USD storage).

---

## Client-facing payment view

Show for a task:

- Task price
- Total paid
- Total refunded
- Net
- Amount still needed / overpay
- List of payments (+ invoice download when available)

---

## Edge cases (must test)

1. Double webhook / replay → single Payment (idempotency).
2. Partial payments until `net == price`.
3. Price increased after partial pay → back to `unpaid`.
4. Price decreased below net → `refund_pending`.
5. Refund exactly to `net == price` → `paid`.
6. Client cannot pay when fully paid.
7. Task with payments cannot be deleted.
8. Cancelled task still has payment history.
9. Manual payment + gateway payment on same task.
10. Failed gateway (no Payment row / pending abandoned — define policy).

---

## Intentional product decisions for rebuild

| Topic                               | Suggestion                                                    |
| ----------------------------------- | ------------------------------------------------------------- |
| Which payment statuses count in SUM | Count only `paid`                                             |
| Real MontyPay refunds vs ledger     | Prefer real refund API or clearly mark “manual ledger refund” |
| Hash verification                   | Mandatory before trusting callback                            |
| Unique tx id                        | DB unique constraint                                          |
| Invoice on failed email             | Keep PDF, status `failed`, allow resend                       |
