# 12 — Quirks & Dead Features

Things in the old codebase that look like product but are incomplete, inconsistent, or unsafe to copy.

## Dead / unused product paths

| Item | Reality | Rebuild advice |
|------|---------|----------------|
| `messages` table / Message model | No send/receive controller UX; Excel export only | Drop unless you want real chat |
| `assignment_transactions` | Never written by app code; export only | Drop or implement real audit log |
| Stripe PHP package | Present in composer; business path is MontyPay | Don’t assume Stripe works |
| `users.user_type` | Migration column; runtime uses `role` | Single column only |

## Logic bugs / inconsistencies

| Issue | Detail | Rebuild advice |
|-------|--------|----------------|
| `isSuperAdmin()` | Requires `role==='admin' AND role==='super_admin'` (impossible) | Real flag or real role |
| Admin OTP | Gated on broken super-admin check → effectively never runs | Explicit 2FA policy |
| `MontyPayService::verifyHash` | Referenced by callback; method missing | Implement verification before trust |
| payment_status validation | Update path allows `pending`/`refunded` while runtime uses `unpaid`/`paid`/`refund_pending` | One enum |
| Lockout copy vs code | Comments mention 5 min for 3–4 fails; code uses 60s | Align UX + policy |
| Feedback.tutor_id | Required in DB/relations; not always in model fillable | Make first-class |
| File.note / Message.subject | In migrations; weak model fillable usage | Keep or drop consciously |
| Session lifetime | `.env` default 120 vs remember 1 week vs idle 30m | Document clearly |
| Upload size | 10MB vs 500MB contradictions | One limit |
| Revision upload bug | File id written into solution_id join | Solutions only |

## Schema ↔ model mismatches to fix

1. Task `is_assigned` used but not always mass-assignment safe.
2. RevisionSession dates not cast consistently.
3. Invoice migration `down()` empty — migration hygiene.
4. Payment export joins may assume missing relations.

## Intentional improvements (recommended)

1. Enforce admin permission JSON or remove it.
2. Auto-cancel open revisions when task cancelled.
3. Unique index on gateway transaction ids.
4. Store storage keys + signed URLs.
5. Count only `paid` payments/refunds in net formula (explicit).
6. Block client solution download until paid **or** keep `allow_view` admin gate — pick one primary rule.
7. Write real assignment audit events if ops need them.
8. Replace encrypted integer IDs with UUIDs.

## Data migration notes (if keeping production data)

1. Map `role` carefully; ignore `user_type` or coalesce.
2. Recompute all `payment_status` from payments/refunds after import.
3. Verify every `revision_session_solutions.solution_id` points at `solutions.id` (fix orphans).
4. Re-upload or rewrite file URLs if bucket/domain changes.
5. Export old invoices list; regenerate only if URLs break.
6. Do not migrate empty messaging / assignment_transaction noise unless needed for history.

## Decision log (fill during rebuild)

| Decision | Choice | Date |
|----------|--------|------|
| Payment gateway | | |
| Object storage | | |
| Admin 2FA | | |
| Public IDs (UUID vs int) | | |
| Keep messages? | | |
| Solution visibility rule | | |
| Upload size limits | | |
