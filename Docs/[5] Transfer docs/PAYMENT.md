# PAYMENT — How Money Works in Original IQ

Practical guide for rebuilding payments. Spec detail: [06-payments-refunds-invoices.md](./06-payments-refunds-invoices.md) · Integration: [09-integrations.md](./09-integrations.md)

---

## What payment means in this product

A **Task** has a `price` (set by coordinator/admin).  
The client pays until the **net amount** equals that price.

```
net = SUM(payments.amount) - SUM(refunds.amount)
```

| If…            | Task `payment_status` becomes |
| -------------- | ----------------------------- |
| `net == price` | `paid`                        |
| `net > price`  | `refund_pending`              |
| otherwise      | `unpaid`                      |

Also useful:

```
amountStillNeeded = price - payments + refunds
overpayAmount     = (payments - refunds) - price
```

Recompute `payment_status` after every payment, refund, payment delete, or price change.

---

## Actors

| Who             | What they do with money                                    |
| --------------- | ---------------------------------------------------------- |
| **Client**      | Pays remaining balance via **MontyPay** checkout           |
| **Admin**       | Manual create/delete payments; refunds; invoices; exports  |
| **Coordinator** | Can initiate refund path (limited); sees payments on tasks |
| **Tutor**       | Sees payment snapshot only — does not charge               |

---

## Data you must store

| Entity                | Role                                    |
| --------------------- | --------------------------------------- |
| `Payment`             | One money-in record (gateway or manual) |
| `PaymentLog`          | Audit events for a payment              |
| `Refund`              | One money-out / ledger refund           |
| `Invoice`             | PDF + email record linked to a Payment  |
| `Task.price`          | Amount owed                             |
| `Task.payment_status` | Derived summary for UI                  |

### Payment fields (important)

- `task_id`, `user_id` (payer / client)
- `amount`, `currency` (default USD)
- `gateway` → `montypay` or `No Gateway` (manual)
- `montypay_transaction_id` → **unique / idempotency key**
- `status` → `pending` \| `paid` \| `failed` \| `canceled` \| `refunded`
- `payment_url`, `payment_method`, `callback_payload`

### Refund fields

Same money shape + `refunder_id` + `refund_reason`.

### Invoice fields

- `invoice_number` → `INV-` + payment id padded to 6 (`INV-000123`)
- `pdf_path` on R2 (`invoices/...`)
- `invoice_status` → `sent` \| `failed`

---

## Flow A — Client pays with MontyPay

```
1. Client opens task payments
2. App computes amountStillNeeded
3. If net >= price → block ("already paid")
4. Create MontyPay checkout session
   - order number: TASK_{taskId}_{timestamp}
   - hash: sha1( md5( upper(orderNumber + amount + currency + description + MERCHANT_PASSWORD) ) )
5. Redirect client to payment_url
6. MontyPay calls your callback URL
7. Verify callback (hash + success + settled)
8. If montypay_transaction_id already exists → ignore (idempotent)
9. Insert Payment status=paid
10. updateTaskPaymentStatus(task)
11. Generate invoice PDF → store on R2 → email client
```

### Env required

```env
MONTYPAY_API_URL=
MONTYPAY_MERCHANT_KEY=
MONTYPAY_MERCHANT_PASSWORD=
APP_URL=   # must match public callback base URL
```

### Critical rebuild rules

1. **Always verify hash** before trusting the callback (old code referenced verify but implementation was missing — fix this).
2. **Idempotent** on transaction id.
3. Only the task’s **client** can start checkout for that task.
4. Amount ≥ `0.01`.

---

## Flow B — Admin manual payment

```
1. Admin enters amount (≤ 2 decimals, ≥ 0)
2. Block if net already >= price (no overpay on manual path)
3. Create Payment: gateway="No Gateway", status=paid
4. updateTaskPaymentStatus
5. Generate invoice
```

Deleting a manual/gateway payment must recompute status and handle the linked invoice.

---

## Flow C — Refunds

```
1. Admin/coordinator requests refund amount + reason
2. Enforce caps (cannot refund past sensible net / overpay rules)
3. Create Refund status=paid (old app often used stub gateway IDs)
4. updateTaskPaymentStatus
   - if still overpaid → refund_pending
   - if net == price → paid
   - else → unpaid
```

**Decision for new app:** real MontyPay refund API vs ledger-only refund clearly labeled `manual_ledger`.

---

## Invoices

Triggered when a Payment becomes `paid` (gateway or manual):

1. Build PDF (client, task, amount, date, invoice number)
2. Upload to object storage under `invoices/`
3. Email client
4. Save Invoice row (`sent` or `failed` if email fails — keep PDF either way)

---

## Currency

- Stored/accounted mainly in **USD**.
- UI may convert via FX API for display (`open.er-api.com` in old app).
- Do not mix currencies in `net` math without converting first.

---

## UI surfaces to rebuild

| Screen                    | Needs                                                               |
| ------------------------- | ------------------------------------------------------------------- |
| Client task payments      | Price, paid, refunded, net, still due, Pay button, invoice download |
| Admin/coord task payments | Same + manual payment/refund forms                                  |
| Admin exports             | Payments, refunds, payment logs CSV                                 |

---

## Must-test cases

1. Exact full payment → `paid` + invoice
2. Two partial payments → `paid` when sum hits price
3. Pay when already paid → blocked
4. Duplicate webhook → one Payment only
5. Bad hash → no DB write
6. Lower price after overpay → `refund_pending`
7. Refund back to price → `paid`
8. Task with payments → client cannot delete task

---

## What NOT to assume

- Stripe package in old `composer.json` ≠ live Stripe flow (runtime is **MontyPay**).
- Refund “URL” in old code may be synthetic — don’t treat it as proof of gateway refund.
- Summing all payment rows including `failed` will break net math — prefer counting only `paid` in the new app.
