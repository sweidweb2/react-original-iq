# 13 — Admin Exports Catalog

Admin reporting surface from the current app (`ExcelController`). Rebuild as CSV and/or XLSX; keep column meaning stable for ops.

## Formats

| Format | Used for |
|--------|----------|
| CSV stream | Most entities |
| PDF (landscape) | Leads, Stay Updated |

Filename pattern: `{base}_{YYYY-MM-DD_HH-mm-ss}.csv` (or `.pdf`).

## Export inventory

| Export | Source entity | Notable columns / joins |
|--------|---------------|-------------------------|
| Users | User | Profile + role + activity fields |
| Tasks | Task | + client_name, tutor_name, coordinator_name |
| Files | File | + task_label, client_name |
| Solutions | Solution | + task_label, client_name |
| Revision sessions | RevisionSession | + task_label, client_name |
| Revision session solutions | RevisionSessionSolution | + revision_task_label, client_name |
| Payments | Payment | + client (tutor join was fragile) |
| Payment logs | PaymentLog | + payment/client/task labels |
| Refunds | Refund | + task_label, client_name, refunder_name |
| Feedback | Feedback | + task_label, tutor_name, client_name |
| Specializations | Specialization | + tutor_name |
| Leads | Lead | CSV + PDF |
| Stay updated | StayUpdated | CSV + PDF |
| Contact messages | ContactMessage | |
| Login attempts | LoginAttempt | |
| Login verifications | LoginVerification | + user_name |
| Messages | Message | + sender_name, receiver_name (legacy) |
| Assignment transactions | AssignmentTransaction | (legacy / empty likely) |

## Access

- Admin only (current).
- If using permission keys, gate with `view_reports`.

## Rebuild recommendations

1. Prefer XLSX or CSV with UTF-8 BOM for Excel Arabic support.
2. Add filters: date range, role, task status, payment_status.
3. Stream large exports; don’t load entire tables into memory.
4. Drop Messages / AssignmentTransaction exports if entities are removed.
5. Log who exported what (audit).
6. For PDF: only where print layout matters; otherwise CSV is enough.

## Smoke tests

- [ ] Each export downloads non-empty header row
- [ ] Arabic names don’t corrupt
- [ ] Large tasks export completes
- [ ] Non-admin denied
