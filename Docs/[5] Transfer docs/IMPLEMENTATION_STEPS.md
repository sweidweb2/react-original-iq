# IMPLEMENTATION STEPS — Rebuild Original IQ on a New Stack

Step-by-step plan to rebuild the app using the Docs pack.  
Carry: this folder + `public_pages/` design export + filled [ENV_VARIABLES.md](./ENV_VARIABLES.md).

---

## Phase 0 — Decisions (half day)

Lock these before coding:

| Decision        | Options / notes                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Backend stack   | e.g. Nest / Django / Laravel fresh / Go…                                                                   |
| Frontend stack  | e.g. Next / Nuxt / React SPA…                                                                              |
| DB              | Postgres recommended (MySQL OK)                                                                            |
| Auth style      | Cookie sessions vs JWT — match [07](./07-auth-otp-session.md) behavior                                     |
| Payment gateway | Keep **MontyPay** or replace adapter ([PAYMENT.md](./PAYMENT.md))                                          |
| File storage    | Keep **R2** or other S3-compatible                                                                         |
| Admin 2FA       | Redesign (old super_admin OTP was broken)                                                                  |
| Public IDs      | UUID vs encrypted ints                                                                                     |
| Dead features   | Drop `messages` UX + unused assignment audit unless you want them ([12](./12-quirks-and-dead-features.md)) |
| i18n            | EN + AR RTL from day 1 or EN-first                                                                         |

**Exit:** short ADR / notes in your new repo README.

---

## Phase 1 — Repo skeleton (day 1)

1. Create new repo + app bootstrap.
2. Copy Docs pack into `docs/` (or keep this folder).
3. Copy `Docs/public_pages/` for marketing UI reference.
4. Fill [ENV_VARIABLES.md](./ENV_VARIABLES.md) → create real `.env` (gitignored).
5. Wire DB, migrations runner, lint/test scripts.
6. Add adapter interfaces early:
   - `PaymentGateway`
   - `ObjectStorage`
   - `Mailer`
   - `FxRates` (optional)
   - `ChatProvider` (optional)

**Exit:** empty app boots, connects to DB, health route works.

---

## Phase 2 — Domain model (1–2 days)

Follow [03-domain-model-and-data-dictionary.md](./03-domain-model-and-data-dictionary.md).

1. Create tables/entities: User, Task, File, Solution, RevisionSession, RevisionSessionSolution, Payment, PaymentLog, Refund, Invoice, Feedback, Specialization, Lead, StayUpdated, ContactMessage, LoginAttempt, LoginVerification.
2. Add enums/constraints for task status, payment_status, revision status.
3. Skip or stub legacy: Message, AssignmentTransaction.
4. Seed: 1 admin, 1 coordinator, 1 tutor, 1 client.

**Exit:** schema matches dictionary; seed users can be queried.

---

## Phase 3 — Auth & RBAC (1–2 days)

Follow [02](./02-roles-and-permissions.md) + [07](./07-auth-otp-session.md).

1. Register (client only).
2. Login / logout / password reset.
3. Rate limit + lockout.
4. Role guards on routes/policies.
5. Session idle timeout + remember-me policy.
6. Admin OTP (your redesigned rule).

**Exit:** each role reaches a protected “hello dashboard” only for their role.

---

## Phase 4 — Task lifecycle (core) (3–5 days)

Follow [04-task-lifecycle.md](./04-task-lifecycle.md).

1. Client create task + auto-assign least-loaded coordinator + file upload hooks.
2. Coordinator/Admin: set price, assign/remove tutor, cancel/activate, update details.
3. Tutor: submit / cancel submit.
4. Coordinator: approve / disapprove (+ `nbDone`).
5. `allow_view` toggle (admin).
6. Delete rules (block if payments/refunds exist).

**Exit:** happy path task goes `pending → in-progress → waiting_coordinator_approval → completed`.

Write tests from section B in [10-acceptance-test-scenarios.md](./10-acceptance-test-scenarios.md).

---

## Phase 5 — Files (1–2 days)

Follow [08-file-storage-and-access.md](./08-file-storage-and-access.md).

1. Implement ObjectStorage adapter (R2).
2. Upload docs / solutions with MIME + size limits (pick **one** limit).
3. Authorized download + bulk zip.
4. Enforce client solution access via `allow_view`.
5. Cleanup objects on delete.

**Exit:** assigned tutor can download docs; client cannot download solutions until allowed.

---

## Phase 6 — Revisions (2–3 days)

Follow [05-revision-lifecycle.md](./05-revision-lifecycle.md).

1. Create session (only one open).
2. Tutor upload revision solutions (Solution + join rows only).
3. Submit / cancel submit / approve / reject / cancel.
4. Block conflicting task completion while open revision.

**Exit:** section C acceptance tests pass.

---

## Phase 7 — Payments (3–5 days)

Follow [PAYMENT.md](./PAYMENT.md) + [06](./06-payments-refunds-invoices.md).

1. Net formula service (single source of truth).
2. Client MontyPay checkout + **verified** webhook + idempotency.
3. Admin manual payment / delete.
4. Refunds + caps.
5. Invoice PDF + R2 + email.
6. Client + admin payment UIs.

**Exit:** section D acceptance tests pass on sandbox.

---

## Phase 8 — Feedback, leads, contact (1–2 days)

1. Feedback + tutor metric averaging.
2. Lead / contact / stay-updated endpoints + admin lists.
3. Optional chatbot (Gemini) later.

**Exit:** public forms land in admin tables.

---

## Phase 9 — Admin ops & exports (1–2 days)

Follow [13-admin-exports-catalog.md](./13-admin-exports-catalog.md).

1. User CRUD activate/deactivate/roles.
2. CSV exports (UTF-8 for Arabic).
3. Custom email if needed.

**Exit:** admin can operate without DB dumping.

---

## Phase 10 — Public marketing site (2–4 days)

Use [public_pages/](./public_pages/) + [11-screens-and-journeys.md](./11-screens-and-journeys.md).

1. Port theme from `_shared/theme.css`.
2. Rebuild pages from exported HTML (Home, Services, About, FAQ, Contact, legal).
3. Wire forms to new APIs.
4. EN/AR + RTL.

**Exit:** public site looks on-brand; forms work.

---

## Phase 11 — Role dashboards polish (ongoing)

Rebuild Client / Tutor / Coordinator / Admin dashboards for real workflows (not marketing).  
Prefer clean UI; keep behavior from Docs, not old JS chaos.

---

## Phase 12 — Parity, harden, launch

1. Run full [10-acceptance-test-scenarios.md](./10-acceptance-test-scenarios.md).
2. Fix gaps vs old product (or document intentional changes in [12](./12-quirks-and-dead-features.md)).
3. Security pass: auth, uploads, webhooks, IDOR on tasks/files.
4. Staging with real R2 + MontyPay sandbox + mail.
5. Data migration plan (if keeping production data).
6. Production cutover: DNS, callbacks, monitoring, backups.

---

## Suggested build order (one line)

```
skeleton → schema → auth/RBAC → tasks → files → revisions → payments/invoices → CRM forms → admin exports → public pages → dashboards → parity tests → launch
```

## What to read before each phase

| Phase | Read first              |
| ----- | ----------------------- |
| 0–1   | 01, ENV_VARIABLES, 12   |
| 2     | 03                      |
| 3     | 02, 07                  |
| 4     | 04, 11                  |
| 5     | 08, 09                  |
| 6     | 05                      |
| 7     | PAYMENT, 06, 09         |
| 8–9   | 02, 13                  |
| 10    | public_pages/README, 11 |
| 12    | 10, 12, 14              |

---

## Definition of done

New app is done when:

1. All four roles can complete their happy paths.
2. Payment net math + invoices match this pack.
3. Acceptance checklist is mostly green.
4. Secrets live only in env — not in git.
5. You are not depending on the old Blade/JS tree to understand behavior.
