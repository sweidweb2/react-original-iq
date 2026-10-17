# Codebase Consistency & Quality Audit — 2026-10-17

Read-only audit of the whole monorepo (`backend/`, `web-app/`, migrations, config, CI, tests, docs). No code was changed. Findings are grouped by **severity**, then by **category**, and end with a **prioritized fix plan** and a list of items that **need a decision** before implementation.

All recommendations stay inside the locked stack (`Docs/[1] Main App/[1] Tech Stack.md`): Express + TS, React + TS (Vite), Supabase via `@supabase/supabase-js`, REST `/api/v1`, JWT access + refresh, Zod, Zustand, Vercel. Anything that would add a library or change an architectural decision is flagged **needs discussion**.

> Status: ✅ = fixed. ✅ (partial) = fixed in part; the item lists what remains. Items with no mark are still open.
>
> **Last status check: 2026-10-17 15:30** — every finding re-verified against the code (not just against change notes).

### Status at last check

| Severity | Total | Done | Partial | Open |
| -------- | ----- | ---- | ------- | ---- |
| Critical | 6     | 1    | 1       | 4    |
| High     | 33    | 23   | 4       | 6    |
| Medium   | 98    | 2    | 22      | 74   |
| Low      | ~114  | 3    | ~13     | ~98  |

- **Still open and most urgent:** C1 (RLS on 26 of 30 tables), C4 (simulated payments / in-memory fallback in production), C5 (reset code never emailed), C6 (seed script resets admin passwords).
- **New risk:** migrations `019`–`023` (fixes for H6, H8, H10–H13) are untracked in git, so a fresh clone/deploy would miss them, as H17 was for `014`. Commit them.
- **Apply to Supabase:** migrations `015`–`023` must be applied for the fixes above to work.

> Note: several web files were being edited while the audit ran. Line numbers are accurate at time of reading but may drift by a few lines in actively edited files.

---

## 0. Summary

- **Overall shape is good.** Backend follows Route → Controller → Service → Repository with factory functions and Zod validation at the edge; web has a single fetch wrapper, no client Supabase access, no `any`, and public pages are almost fully compliant with the RTL rules.
- **Biggest risks are security and money integrity**, not structure:
  - RLS is off on every table; admins can create/modify `super` users; refresh tokens are irrevocable and stored in `localStorage`.
  - Payments default to simulated mode, refunds are uncapped, currencies are summed together, and staff can bypass the task lifecycle via `PATCH /tasks/:id`.
  - Password reset never emails the code.
- **Production readiness gaps:** no Vercel config, in-memory fallbacks silently used when env is missing, `.env.example` crashes boot, CI currently fails (web lint + Prettier).
- **Consistency debt:** two page patterns in portals, duplicated pagination/format/role logic, ~7 copies of the password input, unused theme tokens, inconsistent controller styles in 5 backend modules, three copies of migrations.

**Verification results (at last check)**

- Backend tests: **292/292 pass** (44 files). Web tests: **67/67 pass** (18 files).
- Typecheck: **pass** in both apps. Lint: **pass** in both apps.
- `prettier --check .`: **fail** — 2 files: `backend/src/modules/settings/settings.repository.ts`, `Docs/[4] Database/README.md`.
- Web tests log `auth rehydrate failed ReferenceError` — confirms M49 is a real bug.
- At audit time: backend 143/143, web 46/46, web lint failing (2 unused imports), Prettier failing on 8 files.

**Severity counts (consolidated, de-duplicated):** Critical 6 · High 33 · Medium ~55 · Low ~70.

---

## 1. Critical

### Security

- **C1. Row Level Security disabled on every table**
  - Files: `backend/migrations/001_*.sql` … `014_invoices.sql` (no `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` anywhere).
  - Why: Supabase exposes `public` over PostgREST. Anyone with the (publishable) anon key + project URL can read/write every table, including `users.password_hash`, `payments`, and `login_verifications.code`.
  - Status: open. Only the newer tables `auth_sessions` (015), `backup_history` (016), `rate_limit_hits` (019) and `settings` (023) have RLS; the other 26 tables don't.
  - Fix: new migration `024_enable_rls.sql` (next free number; 015–023 are taken) — `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on all tables with **no policies** (deny by default). Backend uses the service-role key, which bypasses RLS, so the API is unaffected. Optionally `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated`.

- **C2. Privilege escalation: ADMIN can create, promote to, edit, deactivate or delete SUPER** ✅
  - Done: `assertCanManageRole` in `backend/src/authz/ownership.ts` enforced on create/update/deactivate/delete in `users.service.ts`; super allowed on `/users` routes (`USER_ADMIN_ROLES`); UI filters roles via `assignableRoles`/`canManageRole` in `web-app/src/lib/permissions.ts`; super portal gets `/super/users`. Covered by unit + integration tests.
  - Files: `backend/src/modules/users/users.schema.ts` L5 (`roleSchema` includes `'super'`); `backend/src/modules/users/users.service.ts` `updateUser` L121–163, `deactivateUser` L165–184, `deleteUser` L186–215 (no check on target role or assigned role). UI exposes it: `web-app/src/features/admin/users/UserFormDialog.tsx` L23–29, `web-app/src/features/shared/users/ManageUserProfilePage.tsx` L41–47.
  - Fix: add `assertCanManageUser(actor, target, nextRole)` in `backend/src/authz/ownership.ts` — only SUPER may assign `super`/`admin` or modify a `super` user. Filter role options on the client with a `lib/permissions.ts` helper (`assignableRoles(actorRole)`).

- **C3. Refresh tokens cannot be revoked; tokens persisted in `localStorage`; no CSP** ✅ (partial)
  - Done: revocable sessions with a fixed 7-day lifetime — `auth_sessions` table (`backend/migrations/015_auth_sessions.sql`), `auth-sessions.repository.ts`, refresh token carries `sid` and expires at session end; logout revokes the session, password reset revokes all, password change revokes others, admin password reset / deactivation revokes all.
  - Remaining: tokens (access + refresh) still persisted in `localStorage` (`authStore.ts` `partialize`); no CSP meta in `web-app/index.html` and no `headers` block in the root `vercel.json` (`helmet()` covers API responses only).
  - Files: `backend/src/modules/auth/auth.service.ts` `refreshTokens` L182–196, `logout` L198–217; `backend/src/modules/auth/auth.tokens.ts` L38–45; `web-app/src/stores/authStore.ts` L77–80 (`partialize` persists `tokens`); `web-app/index.html` (no CSP).
  - Why: a stolen 7-day refresh token stays valid through logout and password reset, and each refresh mints a fresh 7-day token (sessions never end). Any XSS can read both tokens.
  - Fix (backend, in-stack): `refresh_tokens` table (`jti`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `replaced_by`) or `users.token_version`; rotate on refresh with reuse detection; revoke on logout; bump on password reset. Web: stop persisting the access token (keep in memory). Add CSP + security headers via Vercel config. **Needs discussion:** moving the refresh token to an `httpOnly; Secure; SameSite=Strict` cookie.

- **C4. Unsafe production defaults: simulated payments and in-memory data**
  - Status: open. `assertDeployedSecurity` now enforces JWT secrets + `TRUST_PROXY` (H7/H8), but `PAYMENT_GATEWAY_MODE` still defaults to `simulated` and Supabase is not required in production (`server.ts` only warns).
  - Files: `backend/src/config/index.ts` L65 (`PAYMENT_GATEWAY_MODE … .default('simulated')`); `backend/src/modules/payments/payments.service.ts` `checkout` L300–341 (inserts `status: 'paid'` immediately); every `create*Repository` falls back to memory when `SUPABASE_*` is missing; `backend/src/server.ts` L15–18 only warns.
  - Why: a misconfigured production deploy lets any client mark their own task paid and get an invoice, while data lives in process memory and vanishes per cold start.
  - Fix: in `loadConfig`, when `NODE_ENV` is `production`/`staging`, require `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, strong JWT secrets, and reject `PAYMENT_GATEWAY_MODE=simulated` (same pattern already used for `CORS_ORIGINS`).

### Bugs

- **C5. Password reset code is never emailed**
  - Status: open. No mailer in `auth.service.ts`; `issuePasswordResetCode` still logs `{ email, code }` without Supabase or in development.
  - Files: `backend/src/modules/auth/auth.service.ts` L85–103 (`issuePasswordResetCode` only logs via `shouldLogResetCode`, L75–77). Mailer is only used by `backend/src/modules/invoices/index.ts`.
  - Why: forgot-password is broken for every production user. In non-Supabase mode the code is logged in plain text in any environment.
  - Fix: inject `Mailer` into `createAuthService` like invoices do and send the code. Log only for `development`/`test`, never with `email`.

### Security / tooling

- **C6. `seed-users.ts` resets privileged accounts to the password `password`**
  - Status: open. No `NODE_ENV` guard; `ON CONFLICT … DO UPDATE SET password_hash …` with hard-coded `'password'` unchanged.
  - Files: `backend/scripts/seed-users.ts` L13, L60–74 (`ON CONFLICT (email) DO UPDATE SET password_hash = …, role = …, is_active = true`).
  - Why: running `npm run db:seed:users` against a non-dev `DATABASE_URL` takes over `super@`/`admin@` and reactivates deactivated users.
  - Fix: refuse unless `NODE_ENV` is `development`/`test` (or `--force`); use `ON CONFLICT DO NOTHING`; read the seed password from env.

---

## 2. High

### 2.1 Security & authorization

- **H1. Staff `PATCH /tasks/:id` bypasses the whole task lifecycle** ✅
  - Done: `updateTaskBodySchema` is `.strict()` and content-only (no `status`/`tutorId`/`price`/`paymentStatus`); `createTaskBodySchema` no longer accepts `status` (derived: tutor → `in-progress`, else `pending`). Lifecycle changes go only through `/approve`, `/cancel`, `/assign-tutor`, `/remove-tutor`, `/price`.
  - Files: `backend/src/modules/tasks/tasks.service.ts` L405–407 (`if (staff) Object.assign(patch, body)`); `backend/src/modules/tasks/tasks.schema.ts` L51–66 (allows `status`, `tutorId`, `price`, `paymentStatus`, `feedback`).
  - Why: coordinators can jump to any status, set `paymentStatus: 'paid'`, change price without recompute, assign a non-tutor as `tutorId`, and complete without incrementing `nbDone`.
  - Fix: remove those fields from `updateTaskBodySchema`; route them through dedicated endpoints (`assignTutor`, `updatePrice`, transitions).

- **H2. Feedback can be forged** ✅
  - Done: `feedback.service.ts` loads the task via an injected `findTask` port — client must own it, it must be completed with a tutor, `tutorId` comes from the task (removed from the body), rating `1–5`, one feedback per client per task (service check + `backend/migrations/018_feedback_unique.sql` unique index; `23505` → 409). Web form lists only completed, not-yet-reviewed tasks.
  - Files: `backend/src/modules/feedback/feedback.service.ts` L29–42 (stores client-supplied `taskId`/`tutorId` unchecked).
  - Why: any client can rate any tutor, any number of times, for tasks they don't own.
  - Fix: load the task via the tasks service; require `task.clientId === actor.id`, derive `tutorId` from the task, require `status === 'completed'`; add unique index on `(task_id, client_id)`.

- **H3. Tutor can link solutions from other tasks to a revision (IDOR)** ✅
  - Done: `tutorSubmit` rejects any `solutionId` not in the task's solutions (403), links before changing status.
  - Files: `backend/src/modules/revisions/revisions.service.ts` L153–155; `revisions.repository.ts` L266–280.
  - Fix: verify every `solution.taskId === revision.taskId`; link before changing status (currently status flips first, leaving partial state on failure).

- **H4. Manual payments can be attributed to any user; invoice is emailed to them** ✅
  - Done: `userId` removed from `createManualPaymentBodySchema`; manual payments always use `task.clientId`.
  - Files: `backend/src/modules/payments/payments.service.ts` L228 (`userId: body.userId ?? task.clientId`); `backend/src/modules/invoices/invoices.service.ts` L70–73.
  - Why: task topic/amount leak to an arbitrary third party.
  - Fix: drop `userId` from the schema, or require it to equal `task.clientId`.

- **H5. CSV formula injection in all exports** ✅
  - Done: `escapeCsvCell` prefixes text starting with `= + - @ \t \r` with `'` (numbers untouched); UTF-8 BOM already emitted. Backups opt out (`neutralizeFormulas: false`) so dumps restore byte-for-byte. Kept `\n` line endings (Excel/Sheets read them fine).
  - Files: `backend/src/modules/_shared/csv.ts` L1–7 (only quotes `" , \n \r`).
  - Why: leads/contact messages are public input; cells starting with `= + - @` execute in Excel/Sheets.
  - Fix: prefix such cells with `'`; also emit a UTF-8 BOM (Arabic in Excel) and `\r\n` line endings.

- **H6. Reset-code brute force: no per-account attempt limit, codes stored in plaintext** ✅
  - Done: `backend/migrations/019_auth_hardening.sql` — codes stored as `sha256` hex (compared with `timingSafeEqual`), `attempts` column, atomic `login_verification_register_failure()` burns the code after 5 wrong guesses. New per-email limiter (`AUTH_EMAIL_RATE_LIMIT_MAX`, default 10 / 15 min) on login + all password-reset routes. `login_attempts` left unused — the per-email limiter covers login lockout.
  - Files: `backend/src/modules/auth/auth.service.ts` L104–119, L229–241; `login-verifications.repository.ts` L171–198; `auth.routes.ts` L21. `login_attempts` table (migration 009) is never used.
  - Fix: `attempts` column on `login_verifications`, invalidate after ~5 failures; store `sha256(code)`; key a limiter by email as well as IP; wire `login_attempts` for login lockout (or drop the table).

- **H7. JWT secrets optional and unconstrained** ✅
  - Done: `JWT_*_EXPIRES_IN` validated (`15m`, `7d` format); `algorithms: ['HS256']` pinned in `auth.tokens.ts`; `assertDeployedSecurity` in `config/index.ts` refuses to boot production/staging unless both secrets are set, ≥ 32 characters, and different.
  - Files: `backend/src/config/index.ts` L18–19, L299–310.
  - Fix: in production/staging require both secrets, length ≥ 32, access ≠ refresh; validate `*_EXPIRES_IN` format. Also pin `algorithms: ['HS256']` in `auth.tokens.ts` L49/L62.

- **H8. Rate limiting is per-instance memory and keyed on the proxy IP** ✅
  - Done: production/staging require `TRUST_PROXY=true`. Auth limiters (per-IP and per-email) use a Supabase-backed store (`database/rate-limit-store.ts` → `rate_limit_hits` table + atomic `rate_limit_hit()` in migration 019), so limits hold across Vercel instances; falls back to memory without Supabase and fails open on store errors. The general API limiter stays in memory on purpose (a DB round-trip on every request isn't worth it).
  - Files: `backend/src/middleware/rate-limit.ts` L15–39; `backend/src/app.ts` L20–22 (`TRUST_PROXY=false` default).
  - Why: on Vercel every user shares one IP bucket (global 200/15 min), and counters aren't shared across instances.
  - Fix: require `TRUST_PROXY=true` in production; back auth throttling with a Postgres table (`login_attempts`). **Needs discussion** (no Redis allowed).

### 2.2 Money & business logic integrity

- **H9. Refunds have no cap and no audit trail** ✅
  - Done: `createRefund` caps at paid minus paid/pending refunds, re-checked under a task lock in the `create_task_refund` RPC (`backend/migrations/020_money_integrity.sql`); writes a `payments.refund.create` activity log. (Refunds don't write `payment_logs`, which is keyed by payment.)
  - Files: `backend/src/modules/payments/payments.service.ts` L364–378.
  - Fix: require `amount ≤ paidTotal − (existing paid + pending refunds)`, round, write payment-log + activity entries.

- **H10. Amounts in different currencies are summed as if USD** ✅
  - Done: USD-only ledger — `payments.schema.ts` accepts only `LEDGER_CURRENCY` (`'USD'`) and migration 020 adds `CHECK (currency = 'USD')` on payments and refunds.
  - Files: `backend/src/modules/payments/payments.schema.ts` L18/34/40 (`currency: z.string().length(3)`); `payments.repository.ts` L290–298 (`sumAmounts` ignores currency); recompute L83–105.
  - Fix: restrict `currency` to supported codes and either reject non-USD or store `amount_usd` (via FX service) and sum only that.

- **H11. Payment race: check-then-insert can overpay a task** ✅
  - Done: payments/refunds are created and updated through `create_task_payment` / `update_task_payment` / `create_task_refund` RPCs that `SELECT … FOR UPDATE` the task and re-check caps (migration 020); cap failures map to 400.
  - Files: `payments.service.ts` `checkout` L308–327, `createManualPayment` L216–234.
  - Fix: a Postgres function (RPC) doing `SELECT … FOR UPDATE` on the task + insert, or an idempotency key with a unique constraint.

- **H12. Revision lifecycle violates documented invariants** ✅
  - Done: `createForTask` returns 409 when a revision is open; `update`/`cancel` require an open revision with guarded writes; `cancelTask` cancels open revisions; migration 021 adds the one-open-revision partial unique index.
  - Files: `backend/src/modules/revisions/revisions.service.ts` `createForTask` L60–71 (no `hasOpenForTask` check), `cancel` L97–106 (works from completed), `update` L85–95 (works on closed sessions); `tasks.service.ts` `cancelTask` doesn't cancel open revisions. Spec: `Docs/[5] Transfer docs/05-revision-lifecycle.md`.
  - Fix: status guards with conditional updates; partial unique index `ON revision_sessions(task_id) WHERE status IN ('in-revision','waiting_coordinator_approval')`.

- **H13. Cascading deletes wipe financial records** ✅
  - Done: migration 022 switches `tasks.client_id`, `payments.task_id`, `refunds.task_id` to `ON DELETE RESTRICT` (invoices protected via payments); FK violations (`23503`) now return 409 in `error.middleware.ts`.
  - Files: `backend/migrations/003_tasks.sql` (`client_id … ON DELETE CASCADE`); `006_payments.sql` (payments/refunds/invoices cascade from tasks); conflicts with `RESTRICT` on `payments.user_id`, `refunds.refunder_id`, `feedbacks.*`.
  - Why: deleting a client can erase accounting history, or fail with an FK error that surfaces as a 500.
  - Fix: `ON DELETE RESTRICT` for `users → tasks` and `tasks → payments/refunds/invoices`; prefer deactivation / soft delete. **Needs discussion** (deletion policy).

### 2.3 Bugs (backend)

- **H14. Copying `.env.example` verbatim crashes boot** ✅
  - Done: `withoutBlankValues` in `config/index.ts` drops empty `KEY=` values; `STORAGE_PROVIDER` and `MONTYPAY_*` are commented out in `.env.example`; loading the example verbatim now parses.
  - Files: `backend/.env.example` (empty `KEY=` lines, `STORAGE_PROVIDER=r2`, `MONTYPAY_API_URL=…`); `backend/src/config/index.ts` L15–77, L184–231.
  - Fix: preprocess `''` → `undefined` via a shared `optionalString()` helper; comment out the partial provider blocks in the example.

- **H15. Malformed JSON returns 500 and is stored in `error_logs`** ✅
  - Done: `error.middleware.ts` has the `res.headersSent` guard and maps exposed client errors (< 500) to 400 ("Malformed request body"); too-large bodies return 413.
  - Files: `backend/src/errors/error.middleware.ts` L55–87 (only `entity.too.large` handled).
  - Fix: map body-parser `http-errors` with `status < 500 && expose` to 400 `VALIDATION_ERROR` before the fallback. Also `if (res.headersSent) return next(err)`.

- **H16. Feedback search always 500s** ✅
  - Done: search uses `ilike` on comments/suggestions and `task_id.eq.` only when the term is a UUID.
  - Files: `backend/src/modules/feedback/feedback.repository.ts` L84 (`task_id.ilike.%x%` on a `uuid` column).
  - Fix: remove `task_id` from the OR filter (or match exact UUID when the term is a UUID).

- **H17. `014_invoices.sql` is not committed** ✅
  - Done: `014_invoices.sql` is tracked.
  - New risk: `019`–`023` (and their copies in `backend/supabase/migrations/`, `Docs/[4] Database/migrations/`) are untracked, and `APPLY_ALL.sql` is modified but uncommitted. Commit them.
  - Files: `backend/migrations/014_invoices.sql` (untracked); `invoices.repository.ts` depends on `invoice_seq`, `invoice_number`, `sent_at`, `last_error`.
  - Fix: commit it.

### 2.4 Bugs (web)

- **H18. Failed saves still close dialogs and discard input** ✅
  - Done: `runAction` in `useTaskDetails.ts` and `RevisionDetailsPage.tsx` returns `boolean`; price, revision and edit dialogs close/reset only on success.
  - Files: `web-app/src/features/shared/tasks/useTaskDetails.ts` `runAction` L153–164 and callers L166–210; `web-app/src/features/shared/revisions/RevisionDetailsPage.tsx` L102–113.
  - Fix: `runAction` returns `boolean`; close/reset only on `true` (matches `UserFormDialog`, `PaymentFormDialog`).

- **H19. Dashboard sections have unhandled rejections and no loading/error state** ✅
  - Done: new `hooks/useAsyncData` (`{ data, isLoading, error, reload }`); coordinator, tutor and client sections render through `AsyncState` and refresh via `reload()` after create. `ProfilePage` retry uses a reload key instead of `window.location.reload()`.
  - Files: `web-app/src/features/shared/dashboard/PortalDashboardPage.tsx` L211–220, L327–336, L366–368; admin retry uses `window.location.reload()` (L151).
  - Fix: a small data hook returning `{ data, isLoading, error, reload }`, each section wrapped in `AsyncState`.

- **H20. Payment details dialog spins forever on load failure** ✅
  - Done: dialog tracks `error` and renders `AsyncState` with an in-dialog retry.
  - Files: `web-app/src/features/shared/tasks/PaymentDetailsDialog.tsx` L45–63, L81.
  - Fix: track `error` and render `AsyncState` with retry.

- **H21. Editing a user with no name pre-fills (and saves) the email as name** ✅
  - Done: `profileName()` in `services/users.ts` (no email fallback) pre-fills `UserFormDialog`, `ManageUserProfilePage` and `ProfilePage`; `userDisplayName` is display-only. Edit schemas allow a blank name, which is omitted from the update payload.
  - Files: `UserFormDialog.tsx` L77; `ManageUserProfilePage.tsx` L119, L171; `web-app/src/services/users.ts` L56–62 (`userDisplayName` falls back to email).
  - Fix: pre-fill from real profile fields; keep `userDisplayName` for display only (reuse `ProfilePage.displayNameFromStore`).

- **H22. Feedback can be submitted with 0 stars** ✅
  - Done: `feedback.schema.ts` (task required, rating `1..5`, 2000-char text limits) via `parseForm` with inline `FieldError`s; backend already enforces `1..5`.
  - Files: `web-app/src/features/shared/feedback/FeedbackPage.tsx` L87, L172 (`rating < 0`).
  - Fix: `feedback.schema.ts` with `rating >= 1`, errors via `FieldError`. Backend should enforce `1..5` too.

- **H23. No scroll reset between routes** ✅
  - Done: `components/feedback/scroll-to-top.tsx` mounted inside `BrowserRouter`; scrolls to top on path change, skipped when a hash is present.
  - Files: `web-app/src/App.tsx` L76–113 (no `ScrollRestoration`/`scrollTo` anywhere).
  - Fix: a `ScrollToTop` inside the router (skip when `hash` is present).

### 2.5 Performance

- **H24. No route-level code splitting**
  - Files: `web-app/src/App.tsx` L1–31 (all pages eagerly imported; zero `lazy(`/`Suspense` in `src`).
  - Fix: `React.lazy` + `Suspense` per portal, auth, and public pages.

- **H25. Oversized marketing images without dimensions/lazy loading**
  - Files: `web-app/public/marketing/about-team.png` (1.2 MB), `payment-online.png` (849 KB), `person.png` (256 KB, LCP); used in `AboutPage.tsx` L127–131, L223–227, `HeroSection.tsx` L78–82, `FeaturesSection.tsx` L38–42.
  - Fix: WebP/AVIF at display size; `width`/`height` on every `<img>`; `loading="lazy"` below the fold; `fetchpriority="high"` on the hero.

- **H26. Invoice PDF + R2 upload + SMTP block the payment response**
  - Files: `payments.service.ts` L167–168 → `invoices.service.ts` L80–185 → `backend/src/mail/mailer.ts` L35–42 (no nodemailer timeouts).
  - Fix: set SMTP timeouts (~10 s); don't await issuance in the request (it already swallows errors) or mark `pending` with a retry endpoint.

- **H27. Unbounded selects silently truncated at 1000 rows** ✅ (partial)
  - Done: `database/select-all.ts` (`selectAllRows`, 1000-row pages) used by analytics and backups.
  - Remaining: `tasks.repository.ts` `countStats` still runs an unpaged `select('status')`; `exports.repository.ts` uses `.limit(50000)` without paging (still capped at 1000 by PostgREST).
  - Files: `backend/supabase/config.toml` L18 (`max_rows = 1000`); `tasks.repository` `countStats` L448–461; `users.repository` `countStats` L259–267, `findMany` L226–234; `payments.repository` exports L442–457; `exports.service` L48–52, L128; contact exports.
  - Why: stats and CSV exports become wrong past 1000 rows.
  - Fix: `head: true` counts per status (or a `GROUP BY` RPC); paginate exports in a loop and stream CSV chunks.

### 2.6 Architecture

- **H28. Business rule + N+1 loop in the composition root**
  - Files: `backend/src/routes/v1.ts` L62–75 (`assertDeletable` loops `hasPayments` per task).
  - Fix: move into `users.service` (or a tasks-service port) and replace the loop with one `EXISTS` query.

- **H29. `authenticate` re-parses env on every request and turns misconfig into 401**
  - Files: `backend/src/middleware/authenticate.ts` L22, L29–35; workaround in `backend/tests/helpers/test-config.ts`.
  - Fix: `createAuthenticate(config)` factory built once in `v1.ts` (matches `createAuthRateLimiter(config)`); only map JWT errors to 401.

### 2.7 Deployment, CI & testing

- **H30. No Vercel configuration for either app** ✅ (partial)
  - Done: root `vercel.json` defines a backend service (`src/server.ts`), a web-app service with an SPA rewrite to `/index.html`, and routes `/api/(.*)` to the backend.
  - Remaining: no `headers` block (CSP etc., see C3); `server.ts` calls `app.listen()` rather than exporting the app — confirm Vercel's Express mode handles that in a preview deploy.
  - Files: no `vercel.json`; `backend/src/server.ts` only calls `app.listen()`; web uses `BrowserRouter` with no SPA rewrite.
  - Fix: `backend/api/index.ts` (`export default createApp()`) + `backend/vercel.json` rewrite; `web-app/vercel.json` rewrite to `/index.html` (also the place for CSP/security headers from C3).

- **H31. CI is red today** ✅ (partial)
  - Done: lint passes in both apps; typecheck and tests pass.
  - Remaining: `prettier --check .` fails on `backend/src/modules/settings/settings.repository.ts` and `Docs/[4] Database/README.md`.
  - Files: `.github/workflows/ci.yml` (`format:check`, `lint`); failures listed in §0.
  - Fix: run `npm run format`, remove the two unused imports; ensure the Husky/lint-staged hook runs locally.

- **H32. No tests for revisions, feedback, exports; no HTTP authz tests for tasks/payments/invoices/revisions** ✅ (partial)
  - Done: unit tests for revisions, feedback, exports, payments/invoices, config, CSV, rate limiter; integration tests for users/logs (incl. super hierarchy), auth sessions, task zips.
  - Remaining: no role-matrix integration tests for `/tasks` lifecycle, `/payments`, `/revisions`, `/invoices`. `config.test.ts`, `csv.test.ts`, `rate-limit.test.ts` are untracked.
  - Files: `backend/tests/unit/*`, `backend/tests/integration/*`.
  - Fix: service tests for `revisions`, `feedback`, `exports`; Supertest role-matrix tests (CLIENT/TUTOR/COORDINATOR/ADMIN/SUPER) for `/tasks`, `/payments`, `/revisions`, `/invoices`, seeded from `Docs/[5] Transfer docs/10-acceptance-test-scenarios.md`.

- **H33. Web feature tests missing for the largest areas**
  - Files: `web-app/tests/unit/*` cover schemas, i18n, guards, shell; nothing for tasks, payments, revisions, users, rbac, dashboard. E2E has no task/payment journey.
  - Fix: start with `useTaskDetails`, `payments.schema.ts`, `usePagedAdminList`, and one e2e "create task → simulated pay → invoice".

---

## 3. Medium

### 3.1 Authorization consistency (backend)

- **M1. "Admin" means different things in different places** ✅ (partial: `USER_ADMIN_ROLES`/`isUserAdmin` added and used by users + analytics; `tasks.service` `assertAdmin`, inline `['super','admin']` lists and the local `isPlatformAdmin` in feedback remain) — `backend/src/authz/roles.ts` L7 `ADMIN_ROLES = ['admin']` blocks SUPER from user routes (`users.routes.ts` L20–50) and `isAdmin` checks; `tasks.service.ts` `assertAdmin` L122–126 blocks SUPER while `canManageTask` L128–131 allows it; contact/exports/logging/invoices use inline `['super','admin']`; `feedback.service.ts` L23 defines its own `isPlatformAdmin`. Fix: one `PLATFORM_ADMIN_ROLES` + `isPlatformAdmin()` in `authz/roles.ts`, used everywhere.
- **M2. Coordinator can rename any user, including admins/super** — `users.service.ts` L121–133 (L128–133 is also dead code duplicating L124). Fix: coordinators may only edit tutors/clients.
- **M3. Client can delete their own task in any status; storage objects never purged** — `tasks.service.ts` L622–641. Fix: allow only while `pending` with no tutor; collect file keys and call `purgeStoredObject`.
- **M4. Task/revision transitions are read-then-write (double approve → double `nbDone++`)** — `tasks.service.ts` e.g. `approveTask` L554–573; `users.repository.ts` `incrementNbDone` L340–355. Fix: `expectedStatus` on `repository.update` (`.eq('status', expected)`, 409 if no row); atomic increment RPC.
- **M5. `cancelTask`/`assignTutor` lack status guards; active status of tutor/client not checked** — `tasks.service.ts` L589–598, L463–488, L347–350.
- **M6. Coordinator auto-assignment counts completed tasks, N+1, and loads password hashes** — `tasks.service.ts` L171–189; `tasks.repository.ts` L480–488. Fix: grouped count of active statuses; `findActiveByRole('coordinator')` with explicit columns.
- **M7. Access token role trusted for 15 min; deactivated users keep access** ✅ (partial) — `backend/src/middleware/authenticate.ts` L22–27. Fix: document, or check `is_active`/`token_version` on refresh and in sensitive services. Done: deactivation and admin password resets revoke all sessions, refresh re-checks status, access tokens never outlive the session. Remaining: an already-issued access token still works for up to 15 min.
- **M8. RBAC tables are not enforced; set operations delete-then-insert** — migration `011_rbac.sql` L2; `rbac.repository.ts` L338–359, L438–456; `web-app/src/features/super/rbac/ManageRbacPage.tsx` L128 says so. Fix: transactional RPC; **needs discussion** whether RBAC should be enforced or documented as catalog-only.
- **M9. Tutors see full payment/refund details** — `assertTaskRelated` path in payments; `Docs/[5] Transfer docs/PAYMENT.md` L40 gives tutors a snapshot only. Fix: return summary DTO for tutors.

### 3.2 Money handling

- **M10. Floating-point money and fixed 2-decimal rounding** — `payments.service.ts` L70–75, L96–101; duplicate `roundMoney` in `fx.service.ts` L17–19. KWD/BHD/OMR/JOD use 3 decimals. Fix: one `backend/src/modules/_shared/money.ts` using integer minor units and per-currency precision. **Needs discussion** (cents in the API contract).
- **M11. Recompute edge cases** — `payments.service.ts` L95–102 (price 0 with net > 0 → `unpaid`; negative net → `unpaid`); `tasks.service.ts` `updatePrice` fallback L456–459 disagrees with recompute. Fix: single recompute path.
- **M12. Invoices are deleted and renumbered when a payment is edited/deleted** — `payments.service.ts` L278–282, L349; `invoices.service.ts` L256–267. Fix: `void`/`superseded` status instead of delete. **Needs discussion** (accounting policy).
- **M13. Invoice number assigned in two steps** — `invoices.repository.ts` L128–145; `014_invoices.sql` (`invoice_number` nullable, `lpad(…, 6)` truncates past 999,999). Fix: generated column, `NOT NULL`.
- **M14. Checkout transaction id can collide** ✅ (now `SIM_${taskId}_${randomUUID()}`) — `payments.service.ts` L326 (`SIM_${taskId}_${Date.now()}`). Fix: `randomUUID()`.

### 3.3 Validation & error handling (backend)

- **M15. Raw Postgres errors become 500s** ✅ (partial: `23503` → 409 in `error.middleware.ts`; no shared `mapDbError`, `23505`/`22P02` not mapped centrally, `isUniqueViolation` still duplicated) — every repository does `if (error) throw error` (~120 sites); only `rbac.service.ts` L15–19 and `contact.repository.ts` L50–52 map `23505` (two separate copies). Affects register race (`auth.service.ts` L123–135), user delete FKs, newsletter duplicates. Fix: shared `mapDbError()` in `backend/src/database/` (23505 → 409, 23503 → 409, 22P02 → 400).
- **M16. Some inputs bypass Zod** — `users.schema.ts` L8–10 (id is `min(1)`, not `.uuid()` → 22P02 → 500); contact CSV exports read `req.query.search` raw (`contact.controller.ts` L26–29); no upper bound on `page` (`_shared/pagination.schema.ts` L5); `uploadUrlBodySchema.sizeBytes` has no `.max()`. Fix: `.uuid()` params everywhere, `exportQuerySchema`, bounded pagination.
- **M17. Schema limits don't match DB / UX** — `contact.schema.ts` `name.max(20)`, `message.max(245)` vs `varchar(120)`/`text`; revisions create doesn't enforce `deadline > startDate`.
- **M18. Storage errors are plain `Error`** ✅ (partial: `validateStoredObject` uses `validationError`; unconfigured stub and `assertManagedKey` still throw plain `Error`) — `backend/src/storage/storage.service.ts` L81–84, L101–105. Fix: `serviceUnavailable('STORAGE_NOT_CONFIGURED')`, `forbidden('INVALID_OBJECT_KEY')`.
- **M19. Upload validation trusts client MIME and size** ✅ (partial: `resolveUploadedObject` re-validates extension/MIME/size from storage stat; no magic-byte check, MIME still client-declared) — `backend/src/storage/validate.ts` L45–54; `tasks.service.ts` L257–276 (`resolveUploadedObject` accepts HEAD metadata); presigned PUT doesn't sign `content-length` (`storage.service.ts` L175–184). Fix: re-run `assertValidUpload` on stat size/type, check magic bytes from a ranged GET, delete on failure; enforce task cap at confirm time.
- **M20. Storage keys accept unvalidated `taskId`** ✅ (partial: mitigated by route UUID checks and `isUploadKeyForTask` rejecting `..`; `buildObjectKey`/`isManagedObjectKey` themselves still don't validate) — `backend/src/storage/keys.ts` L24–42. Fix: assert UUID; reject `..`, `//`, `\` in `isManagedObjectKey`.
- **M21. Password reset not atomic** — `auth.service.ts` L234–241; `login-verifications.repository.ts` L204–212. Fix: consume code with conditional update (`eq('used', false)`) first.
- **M22. Login timing + register 409 allow enumeration** — `auth.service.ts` L155–158, L122–126. Fix: dummy bcrypt compare on missing user; decide register policy (**needs discussion**).
- **M23. Activity logs mostly lack actor; mutations/exports not logged** ✅ (partial: `users.create/update/delete` carry the actor; `tasks.create`, `tasks.delete`, all rbac logs and `invoices.issue` still don't) — `tasks.service.ts` L384–389, L636–640; `users.service.ts` L112–117; `rbac.service.ts` (no actor param); `invoices.service.ts` L177–181. Fix: pass `AuthActor` + request context into services; log every mutation and PII export.
- **M24. Wrong status codes for invalid transitions** ✅ (partial: revisions return 409 when a guarded update loses a race; precondition failures in tasks/revisions/refunds still return 400) — `tasks.service.ts` L531/547/561/607, `revisions.service.ts` L115/129/146, payments L390/410 return 400 `VALIDATION_ERROR`. Fix: 409 `CONFLICT` with domain codes (`INVALID_TASK_TRANSITION`).

### 3.4 Backend architecture & consistency

- **M25. Inconsistent controller style** — dominant style is `respond(status, (req) => service.x(requireActor(req), …))` (tasks, payments, revisions, users, fx, invoices, feedback, health). Deviations with manual try/catch: `auth.controller.ts` L6–110, `rbac.controller.ts` L20–130, `specializations.controller.ts` L16–52 (its own `requireActor`), `logging.controller.ts` L14–51 (re-applies defaults, casts query), `exports.controller.ts`, part of `contact.controller.ts`. Fix: convert to `respond`/`respondEmpty`/`requireActor`.
- **M26. Inconsistent activity logging** — `auth.service.ts` has 5 copies of `try { await logging?.recordActivity } catch {…}`; all other services call `getLoggingService().recordActivitySafe(...)`. Fix: use `recordActivitySafe` via injected dependency.
- **M27. Services call other modules' repositories directly** — tasks → `UsersRepository`; revisions → `TasksRepository`; payments → `TasksRepository.update`; invoices → payments/tasks/users repos (and writes `payment_logs`); exports → 5 repos; `tasks.repository.ts` L625–635 queries `payments`. `v1.ts` imports module internals (L7, L10, L20, L25, L27–28). Fix: inject narrow service ports (`TasksService.setPaymentStatus`, `getTaskParties`) instead of repositories.
- **M28. Inconsistent module factories and route mounting** — `backend/src/routes/v1.ts` L38–105: health wired by hand (no `index.ts`); `createLoggingModule()` takes no config and is mounted at root with absolute paths; revisions/payments/invoices return objects while others return a `Router`; `createExportsModule(_config, …)` ignores config; tasks repository receives a closure from payments repository. Fix: standard `createXModule(config, deps) => { routes, service }`, each mounted under its own prefix.
- **M29. Hidden `loadConfig()` defaults in ~25 factories + global singletons** — `database/supabase.ts` L12/L32, `storage/storage.service.ts` L245–259, `mail/mailer.ts` L82–91, `logging/logger.ts` L37, every `create*Repository(config = loadConfig())`; `getMailer()` takes no config. Fix: require `config`; build singletons once in `createApp`/`createV1Router`.
- **M30. Error middleware imports a domain module** — `backend/src/errors/error.middleware.ts` L5. Fix: `createErrorHandler({ recordError })` wired in `createApp`.
- **M31. Exports module has no repository/types and duplicates contact exports** ✅ (partial: `exports.repository.ts` + `exports.schema.ts` added; no `exports.types.ts`, still reads other modules' repositories, leads export still duplicated) — `backend/src/modules/exports/*`; leads exported both at `/contact/leads/export` (`contact.service.ts` L92–107, includes `zip`) and `/exports/leads` (`exports.service.ts` L112–126, no `zip`). Fix: one export path; give exports a proper shape.
- **M32. Duplicated helpers** — search sanitizer ×5 (`users`, `feedback`, `contact`, `logging`, `tasks` repositories), `nowIso` ×5, `roundMoney` ×2, `isUniqueViolation` ×2, "can manage task" ×4 (`canManageTask`, `canManageRevisions`, `canManagePayments`, `assertCanDownload`), `loadTask` ×3, list-meta builder ×5. Fix: move into `backend/src/modules/_shared/` and `backend/src/authz/`.
- **M33. Large files** (grown since audit) — `tasks.service.ts` (852 lines, was 723), `tasks.repository.ts` (688), `payments.repository.ts` (544), `payments.service.ts` (516), `contact.repository.ts` (497), `rbac.repository.ts` (473). About 40 % of repository code is the in-memory fallback. Fix: split tasks into `tasks.files.service.ts` / transitions; **needs discussion** whether in-memory repos should move to `tests/`.
- **M34. Redundant queries on hot paths** — `tasks.service.ts` `listFiles` L658–661, `getFileDownloadUrl` L663–670 (loads all files to find one), `buildView` L173–178, `payments` recompute L88–92 (refunds fetched twice), `invoices.getDownloadUrl` L239–241; nested routers re-run `authenticate`. Fix: reuse fetched rows; add `findFile(taskId, fileId)`.
- **M35. Overfetching** — `select('*')` in `feedback.repository.ts` L132/L142 and 10× in `contact.repository.ts`; `USER_COLUMNS` (`users.repository.ts` L39–40) includes `password_hash` on lists/exports. Fix: explicit columns; separate "account with hash" column set for auth only.

### 3.5 Backend infra

- **M36. Health DB probe uses Supabase Auth admin API and is public/unthrottled** — `backend/src/database/supabase.ts` L38; `rate-limit.ts` L21–24. Fix: `from('users').select('id', { head: true })`; rate-limit `/health/db`.
- **M37. Shared auth limiter for all auth routes** ✅ (partial: separate Supabase-backed per-IP and per-email limiters on login/password routes; `/refresh` and `/logout` still share the per-IP budget with login/register) — `auth.routes.ts` L21–51 (20/15 min per IP for login, refresh, logout, OTP). Fix: separate limiters (login/register; OTP by email; looser for refresh).
- **M38. No `unhandledRejection` handler; shutdown may hang** ✅ (partial: `unhandledRejection` reported, `uncaughtException` exits after 1 s; `shutdown` still has no forced-exit timeout) — `backend/src/server.ts` L29–37.
- **M39. Scripts disable TLS verification** — `seed-users.ts` L52, `seed-rbac.ts` L218, `apply-migrations.ts` L51 (`rejectUnauthorized: false`).
- **M40. `seed-rbac.ts` wipes admin-edited role permissions, no transaction** — L271, L291.
- **M41. Migration runner has no tracking or transactions** — `backend/scripts/apply-migrations.ts` L63–70. Fix: `schema_migrations` table; `BEGIN/COMMIT` per file.

### 3.6 Database

- **M42. Migrations exist in three places** (still true for 001–023) — `backend/migrations/` (canonical per `.cursor/rules/backend.mdc`), `backend/supabase/migrations/` (untracked), `Docs/[4] Database/migrations/` (+ `APPLY_ALL.sql` twice). Currently byte-identical. Fix: keep `backend/migrations/` only; delete Docs copy; decide on Supabase CLI (**needs discussion**); generate `APPLY_ALL.sql`.
- **M43. Missing indexes** — no `created_at` index on `tasks`, `payments`, `refunds`, `leads`, `stay_updated`, `contact_messages`, `feedbacks`, `invoices`; no composites `tasks(client_id, created_at)`, `tasks(tutor_id, status)`, `payments(task_id, status)`, `login_verifications(user_id, type, used)`; unindexed FKs in `assignment_transactions`. Fix: a new indexes migration (next free number is 024+).
- **M44. Case-sensitive email uniqueness** ✅ (partial: Zod lowercases emails in auth/users/contact; no `lower(email)` unique index) — `002_users.sql`, `008_leads_and_contact.sql`. Fix: `UNIQUE (lower(email))`; lowercase in Zod.
- **M45. No CHECK constraints on money; inconsistent precision** ✅ (partial: migration 020 adds the USD currency CHECK and cap-enforcing RPCs; no `amount > 0` / `price >= 0` CHECKs, precision still mixed) — `tasks.price numeric(8,2)` vs `payments.amount numeric(10,2)`; no `amount > 0`, `price >= 0`, currency format. Fix: align to `numeric(12,2)` + checks.
- **M46. `schema.dbml` drift** — `Docs/[4] Database/schema.dbml` (`revision_sessions.status` default `'in_revision'` ≠ DB `in-revision`; no `ON DELETE` annotations; indexes missing).

### 3.7 Web — architecture & data layer

- **M47. Network failure during refresh logs the user out** — `web-app/src/services/api.ts` L88–94. Fix: clear session only on `ApiError` 400/401/403.
- **M48. Network errors not normalized** ✅ (partial: `fetchOrNetworkError` throws `ApiError(0, …, 'NETWORK_ERROR')`, `describeError` in `services/toast.ts`; `LeadModal.tsx` and `ContactPage.tsx` still show raw `error.message`) — `api.ts` L57–61, L126–135; `services/toast.ts` L5–9 and `components/feedback/async-state.tsx` L15–19 duplicate message extraction. Fix: throw `ApiError(0, …, 'NETWORK_ERROR')`; single `getErrorMessage(err, fallback)`.
- **M49. Auth store rehydration callback likely throws (TDZ)** — `web-app/src/stores/authStore.ts` L81–86 references `useAuthStore` inside its own initializer; L98–104 `queueMicrotask` hack masks it. Fix: `onRehydrateStorage: (state) => () => state?.setHydrated(true)`, remove the hack.
- **M50. Auth state not synced across tabs** — `authStore.ts`. Fix: `storage` event → `useAuthStore.persist.rehydrate()`.
- **M51. Production silently falls back to `http://localhost:3000/api/v1`** ✅ (partial: fallback is now same-origin `/api/v1`; no `src/vite-env.d.ts`/`ImportMetaEnv` typing, `.env.example` still points at localhost) — `api.ts` L1–2; no `src/vite-env.d.ts`; `VITE_APP_*` in `.env.example` unused. Fix: throw in `PROD` if missing; type `ImportMetaEnv`.
- **M52. Role/route rules defined twice; unknown portal URLs render the public 404** — `web-app/src/App.tsx` L33–74 vs `features/portals/portalNav.ts` L27–95; `App.tsx` L92 and `publicRoutes.tsx` L21–31 (e.g. `/admin/unknown` → `/:lang` with `lang="admin"`). Fix: `capabilities` per `PortalDefinition` driving both; `path="*"` inside each portal.
- **M53. Inline role checks contradict `lib/permissions.ts`** ✅ (partial: `canManageRole`/`assignableRoles`/`ROLE_OPTIONS` added; ~36 inline `role === '…'` checks remain across 10 files) — `useTaskDetails.ts` L47–50, `TaskPaymentsPage.tsx` L86–88, `RevisionDetailsPage.tsx` L43, `TasksPage.tsx` L81–83, `FeedbackPage.tsx` L63–72, `ManageUserProfilePage.tsx` L71–72, `ProfilePage.tsx` L267, `PortalDashboardPage.tsx` L482–501; `lib/permissions.ts` `STAFF_ROLES` includes tutor while every feature's `isStaff` excludes it. Fix: named capabilities (`canManageTasks`, `canManageRefunds`, …) in `lib/permissions.ts`.
- **M54. `RequireAuth` saves `from` but login ignores it; `GuestOnly` applied inside pages** — `components/auth/RequireAuth.tsx` L26; `GuestOnly.tsx` L27; five auth pages wrap themselves (`LoginPage.tsx` L50/126, etc.). Fix: `GuestOnly` as a layout route in `App.tsx`; honor `from` only if it starts with `/`, not `//`, and belongs to the user's portal.
- **M55. Duplicated pagination logic and types** ✅ (partial: `usePagedAdminList` + `AdminListPagination` used by Leads/Contact/StayUpdated; still hand-rolled in ManageUsers, Feedback, ActivityLogs, Tasks, ErrorLogs, Backup pages) — `ManageUsersPage.tsx` L149–192, `FeedbackPage.tsx` L94–157, `ActivityLogsPage.tsx` L103–147, `TasksPage.tsx` L100–149 re-implement `features/admin/_shared/usePagedAdminList.ts`; five identical `*ListMeta` types in `services/`; search+page effects fire two requests. Fix: generic `hooks/usePagedList.ts` with `filters`; `components/ui/pagination.tsx`; one `PageMeta`/`Paginated<T>` in `services/api.ts`.
- **M56. Stats re-fetched on every page/filter change** — `ManageUsersPage.tsx` ~L171, `ActivityLogsPage.tsx` ~L126.
- **M57. `ManageUserProfilePage` load not cancellable; exhaustive-deps suppressed** — L111–148.
- **M58. Activity log "Today" uses UTC midnight** — `web-app/src/features/super/ActivityLogsPage.tsx` L41–44 (the newer `ErrorLogsPage.tsx` copies the same bug).
- **M59. `window.open` after `await` (popup blockers)** — `useTaskDetails.ts` L263, `TaskPaymentsPage.tsx` L177.
- **M60. Portal base path derived with regexes / hardcoded** ✅ (partial: `ManageUsersPage` links relatively; no `usePortal()` hook, regex still in `useTaskDetails`, `TasksPage`, `ManageUserProfilePage`) — `useTaskDetails.ts` L45–46, `TasksPage.tsx` L78, `ManageUserProfilePage.tsx` L73–75, `PortalDashboardPage.tsx` L482–489, `ManageUsersPage.tsx` L434. Fix: `usePortal()` hook built on `findPortal(pathname)`.
- **M61. Dropdowns silently capped at 100 items, errors swallowed** — `useTaskDetails.ts` L119/L138, `TasksPage.tsx` ~L108, `FeedbackPage.tsx` L103.
- **M62. Layering inversions** — `services/toast.ts` imports `components/ui/toast`; `components/auth/RequireRole.tsx` L4 and `components/errors/ErrorBoundary.tsx` L3 import from `features/errors`; `lib/homePath.ts` L1 imports `features/portals`; `portalNav.ts` L16 imports a type from `PortalShell.tsx`. Fix: move `toastApiError` to `lib/`; move `PORTALS`/`PortalNavItem` to a non-UI module; inject error pages.

### 3.8 Web — UI/UX consistency

- **M63. Seven portal pages bypass `PortalPageShell`** — `ContactMessagesPage`, `LeadsPage`, `StayUpdatedPage`, `ManageUsersPage`, `FeedbackPage`, `ActivityLogsPage`, `ManageRbacPage` (the latter has no `max-w-6xl`, `ManageRbacPage.tsx` L125). Fix: wrap in `PortalPageShell` (already provides title, breadcrumbs, `PageHeader`, max width).
- **M64. Destructive actions confirmed three different ways (or not at all)** — none: refund delete (`TaskPaymentsPage.tsx` L211/L483), file/solution remove, cancel task (`TaskControlsSection.tsx` L98–105), cancel revision, deactivate from profile (`ManageUserProfilePage.tsx` L184–197); `window.confirm`: `useTaskDetails.ts` L220, `ManageUserProfilePage.tsx` L445; `Dialog` elsewhere. Fix: `components/feedback/confirm-dialog.tsx` everywhere.
- **M65. Inconsistent loading/error UI** ✅ (partial: task actions update their own data instead of reloading; `reload()` still swaps `TaskDetailsPage` for a spinner, `AsyncState` + sr-only placeholder pattern remains in 5 pages) — `InlineSpinner` vs `AsyncState` skeleton vs custom skeleton vs plain text (`TasksPage.tsx` L225) vs nothing (dashboard); `AsyncState` used with an `sr-only` placeholder child just to show errors (TaskDetails L84, TaskPayments L255, Profile L128, Tasks L227); task details replaces the whole page with a spinner on every reload (`useTaskDetails.ts` L82–113, `TaskDetailsPage.tsx` L69–75). Fix: `isLoading`/`error`/`onRetry` props on `PortalPageShell`; full spinner on first load only.
- **M66. Three form approaches; Zod missing on several mutations** — no schema: contact/leads/stay-updated admin dialogs (HTML `required` only), `TaskDetailsDialogs.tsx` (empty topic can be sent), revision edit, refund form, feedback submit, specialization add; inline duplicate schema in `ManageUserProfilePage.tsx` L49–57 (copy of `users.schema.ts` L12–22). Fix: everything through `parseForm` + `FieldError` with a `<feature>.schema.ts`.
- **M67. Dialogs closable / Cancel clickable while saving** ✅ (partial: delete confirms on Feedback/Leads/StayUpdated/Contact/ManageUsers/TaskPayments now block close while pending; no `dismissible` prop, RBAC, task-details, revision-edit, refund and user/role/permission form dialogs still unguarded) — guarded only in `PaymentFormDialog`, `SimulatedCheckoutDialog`, pending-delete dialogs; unguarded in `UserFormDialog`, `RoleFormDialog`, `PermissionFormDialog`, `AssignPermissionsDialog`, RBAC delete (L293), task create, refund (L558), `TaskDetailsDialogs`, revision edit, contact/leads/stay-updated dialogs. Fix: `dismissible={!isPending}` on `Dialog`.
- **M68. Duplicated small components** ✅ (partial: shared `components/ui/icon-action.tsx` now used everywhere; no `switch`, `stat-card` or `password-input` — `AccessSwitch`/`ClientViewSwitch` duplicates and 5 copies of the Eye/EyeOff toggle remain) — `IconAction` ×6 (`admin/_shared/adminListUtils.tsx` + local copies in `ManageUsersPage` L60, `FeedbackPage` L40, `TaskPaymentsPage` L57, `ActivityLogsPage` L57, `ManageRbacPage` L30, plus `TaskIconAction.tsx`); Switch ×2 (`ManageUsersPage.tsx` L83–117 physical vs `TaskControlsSection.tsx` L7–39 logical); `DetailRow` ×2; stat cards ×5 variants; password-reveal input ×7 (`LoginPage`, `RegisterPage`, `ResetUpdatePage` ×2, `ProfilePage` ×2, `UserFormDialog`) using physical `pr-10`/`right-2`. Fix: `components/ui/icon-button.tsx`, `switch.tsx`, `stat-card.tsx`, `password-input.tsx`, a `<dl>`-based `description-list.tsx`.
- **M69. Two sidebar implementations; shared one unused** — `web-app/src/components/layout/sidebar.tsx` (zero consumers) vs `features/portals/PortalShell.tsx` L146–286. Fix: use or delete.
- **M70. Mobile portal drawer lacks overlay a11y; hidden links stay focusable** — `PortalShell.tsx` L190–195, L288–295. Fix: render inside `<Sheet side="start">` below `md`, or `inert={!mobileOpen}` + Escape.
- **M71. RBAC page builds its own tabs** — `ManageRbacPage.tsx` L147–169 (no `role="tab"`). Fix: `components/ui/tabs.tsx` + `?tab=` like `TaskDetailsPage`.
- **M72. Money formatted three ways, mostly hardcoded `$` + floats** — `TasksPage.tsx` L262, `TaskDetailsPage.tsx` L136, `TaskPaymentsSection.tsx` L53, `SimulatedCheckoutDialog.tsx` L84/113/127 (can render "Pay $NaN"), `PaymentFormDialog.tsx` L121, `PaymentDetailsDialog.tsx` L73/87, `TaskPaymentsPage.tsx` L37/L308. Fix: `lib/format.ts` `formatMoney(amount, currency)`.
- **M73. Date formatters copied ~10 times with different output** — `adminListFormat.ts` L1, `ManageUsersPage.tsx` L119, `FeedbackPage.tsx` L30, `TasksPage.tsx` L51, `RevisionDetailsPage.tsx` L31, `TaskPaymentsPage.tsx` L41, `PaymentDetailsDialog.tsx` L18, `ActivityLogsPage.tsx` L46, `ActivityLogDetailsDialog.tsx` L13, `taskDetailsFormat.ts` L49. Fix: `formatDate`/`formatDateTime` in `lib/format.ts`.
- **M74. Toasts render under dialogs** ✅ (toast uses `zIndex.toast`) — `components/ui/toast.tsx` L53 (`z-50`) vs `dialog.tsx` L29 (`zIndex.modal` = 1300), `sheet.tsx` L28; `theme/zIndex.ts` L12 `toast: 1500` unused. Fix: use the token.
- **M75. Theme TS tokens mostly dead and drifted from CSS** — `web-app/src/theme/*.ts` (only `zIndex` imported); drift vs `index.css`: missing Arabic font family, button/input heights (36 vs 40), sidebar width (240 vs 256), no `--color-success` (Alert/Badge reuse `chart-5`), "warning" uses `accent` orange in Alert/Badge but `--warning` in StarRating, `--radius-xl…4xl` all 18 px. Fix: `index.css @theme` as single source; add `--color-success`; delete unused TS token files (keep `zIndex`).
- **M76. Form fields don't associate errors with inputs** — `components/forms/form.tsx` L13–31 (`data-invalid` dropped, `FieldError` has no `id`/`role="alert"`). Fix: `Field` context with `useId()`; `aria-describedby`.
- **M77. `cn()` doesn't resolve Tailwind conflicts** — `web-app/src/lib/utils.ts` L1–3 (e.g. `PortalShell.tsx` L271 `justify-start` vs `button.tsx` L31 `justify-center`). Fix: variant props instead of overrides; **needs discussion:** `tailwind-merge`.

### 3.9 Web — public pages, i18n & RTL

(Public folders are otherwise compliant: no physical utilities, gradients/keyframes direction-aware, Sheet/toast placement correct, `ar` typed as `typeof en`, schema factories memoized, legal section ids aligned.)

- **M78. Arabic Services hero gets line-height 1–1.2** — `web-app/src/features/public/ServicesPage.tsx` L119–129 (`leading-none` on `h1`, spans with `text-4xl…6xl`). Fix: drop `leading-none`; `rtl:leading-[1.45]` on spans or broaden the global rule in `index.css` L167–169.
- **M79. English text on Arabic pages** — 404 (`features/errors/NotFoundPage.tsx` L9–19, rendered by `publicRoutes.tsx` L26/42); close `aria-label`s in `components/ui/sheet.tsx` L29/50 and `dialog.tsx` L33/52; `components/ui/star-rating.tsx` L28/L53 ("out of", "stars"); raw API errors in `home/LeadModal.tsx` L81, `public/contact/ContactPage.tsx` L178/292, `services/api.ts` L66. Fix: dictionary keys + `closeLabel`/`formatLabel` props; map `ApiError.code` → dictionary messages.
- **M80. Hash-scroll bugs** — `/contact#support` (`PublicFooter.tsx` L30) never scrolls (`ContactPage` lacks `useHashScroll`); Home sections lack `scroll-mt-*` (`TestimonialsSection.tsx` L13, `HowItWorksSection.tsx` L11, `ProcessSection.tsx` L16, `FeaturesSection.tsx` L19) while Services/Legal have it; `LegalPage.tsx` L11–19 uses `window.history.pushState(null, …)` behind React Router's back (breaks `LanguageSwitcher` hash, deep links don't scroll). Fix: call `useHashScroll()` once in `PublicLayout`; `navigate({ hash })` in Legal; consistent `scroll-mt-20`.
- **M81. Arabic pages flash LTR on first paint** — `web-app/src/i18n/LocaleGate.tsx` L13–22 (`useEffect`); `index.html` L2. Fix: `useLayoutEffect` + tiny inline script setting `lang`/`dir` from the first path segment.
- **M82. Icons/tones coupled to dictionary array order** — `HeroSection.tsx` L10/L85, `ProcessSection.tsx` L9/L38, `FeaturesSection.tsx` L11/L32/L54, `AboutPage.tsx` L31–35/L135/L203/L247 (violates "use stable `id`/`icon`/`kind`"). Services content already does this correctly. Fix: `icon`/`tone` keys per item.
- **M83. Loose content typing** — `content/faq.ts` L12, `content/legal.ts` L7 (`id: string`); fixed-length arrays not typed as tuples. Fix: literal unions / shared `ids as const` skeleton with `satisfies`.
- **M84. Locale-independent data duplicated in `en`/`ar` files** — `content/services.{en,ar}.ts` (ids, colors, prices, icons), stat values in `home/i18n/*` and `public/i18n/*`. Fix: base object + per-locale strings merged by id.
- **M85. Prices hand-formatted in four places; no `Intl.NumberFormat('ar-u-nu-latn')`** — `services.en.ts` L170–185, `services.ar.ts` L163–178, `public/i18n/en.ts` L227, `ar.ts` L223. Fix: numeric values + `formatPrice(locale, value, currency)` in `src/i18n`.
- **M86. Phone validation rejects Arabic-Indic digits and `+`** — `features/home/lead.schema.ts` L17. Fix: normalize digits before the regex.
- **M87. Contact data duplicated with drifting formats** — email in ~12 places (`AboutPage.tsx` L28, `ContactPage.tsx` L64/68, `LegalPage.tsx` L9, `legal.*.ts`, `faq.*.ts`); phone in three formats (`AboutPage.tsx` L29, `ContactPage.tsx` L73, `WhatsAppButton.tsx` L10); address/hours spelled differently. Fix: `features/public/siteInfo.ts`.
- **M88. Four hand-synced page lists** — `publicNav.ts` L1–19 (`PUBLIC_NAV`, `LOCALIZED_PUBLIC_PATHS`), `PublicFooter.tsx` L12–31, `publicRoutes.tsx` L34–42; footer labels contradict nav ("About" vs "About Us"). Fix: one `PUBLIC_PAGES` registry.
- **M89. Three container systems** — `publicContainer.ts` L1 vs `home/content.ts` L1–2 (desktop-first, different paddings) vs per-page `max-w-* px-4` in About/Services/FAQ/Legal. Fix: `publicContainerClass` + one narrow variant; delete `homeContainer`.
- **M90. Inconsistent section spacing, heading scale, CTA styles** — padding varies (`py-8`…`py-24`), `h1` sizes from `text-2xl` (Legal L72) to `text-6xl`; Contact `h1` appears after three `h2`s (L185); CTA variants differ (`CtaSection.tsx` L25, `ServicesPage.tsx` L132 pill, `FaqPage.tsx` L87, `ContactPage.tsx` L129, `AboutPage.tsx` L275); gradient-stripe banner copy-pasted 3× in two syntaxes (`CtaSection.tsx` L13–21, `AboutPage.tsx` L266–267, `ContactPage.tsx` L299–300). Fix: `SectionHeader`, `PageHero`, `GradientBanner`; one section padding scale.
- **M91. Privacy policy references a "Last Updated" date that isn't rendered** — `content/legal.en.ts` L254, `legal.ar.ts` L260. Fix: `lastUpdated` field rendered in `LegalPage`, or remove the sentence in both.
- **M92. No meta description / canonical / Open Graph** — `index.html` L14; `hooks/useDocumentTitle.ts`. Fix: `usePageMeta({ title, description })` with per-page dictionary strings.
- **M93. Contradictory marketing numbers across pages** — `home/i18n/en.ts` L10–21, `public/i18n/en.ts` L128–132, `services.en.ts` L17/L145, `faq.en.ts` L48/L53. Fix: one `siteStats` object.

### 3.10 Config, tooling & docs

- **M94. Node version not pinned consistently** ✅ (partial: `engines.node >=20` in root and backend; no `.nvmrc`, CI hard-codes Node 20, web-app has no `engines`) — CI `node-version: 20` (EOL), `engines: >=20`, no `.nvmrc`, `@types/node` `^26` (backend) vs `^24` (web). Fix: Node 22 LTS everywhere (`.nvmrc`, `engines`, CI `node-version-file`, Vercel).
- **M95. TS/ESLint strictness differs between apps** — backend lacks `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch`; neither has `noUncheckedIndexedAccess`; web `tests/**` and `playwright.config.ts` are never type-checked; no type-aware lint (`no-floating-promises`). Fix: align both `tsconfig`s; add `tsconfig.test.json` in web; enable `recommendedTypeChecked`.
- **M96. CI doesn't run `build` for either app** — `.github/workflows/ci.yml`. Fix: add `npm run build` steps.
- **M97. Line-ending mismatch** — `core.autocrlf=true`, no `.gitattributes`, Prettier/EditorConfig require LF. Fix: `.gitattributes` with `* text=auto eol=lf`.
- **M98. Docs out of date** — `README.md` roles (`SUPER · ADMIN · TUTOR · STUDENT`, missing COORDINATOR, says R2 removed, "Supabase later"); `Docs/[1] Main App/[4] Libraries.md` missing `@aws-sdk/*`, `nodemailer`, `pdfkit`, `pg`, `dotenv`, `cors`, Tailwind; `Docs/[3] Decisions/[3] CI & Testing.md` says "CI wiring TBD"; `Docs/[4] Database/README.md` and `APPLY_ALL.sql` header say 001–010 (migrations now go to 023).

---

## 4. Low

### 4.1 Backend

- `authorize()` with no roles allows everyone — `backend/src/middleware/authorize.ts` L13–16 (contradicts "default deny" comment).
- Ownership helpers duplicated / unused — `authz/ownership.ts` (`assertOwnerOrAdmin` ≡ `assertSelfOrAdmin`, `isStaff`, `STAFF_ROLES` unused; `OPS_ROLES` untyped and lives outside `roles.ts`).
- Two shapes for the user role (`role` in JWT/DTO vs `roles: RoleName[]` on `req.user`; `AuthActor.roles: readonly string[]`) — `types/express.d.ts`, `authz/ownership.ts` L4–7.
- Role casing: code/DB use lowercase (`'super'…'client'`) while `.cursor/rules/project-core.mdc` and the tech-stack doc say `SUPER | ADMIN | …`. Recommend updating the rule text, not the code.
- Email schema trims after `.email()` and is defined three times; `z.string().email()` deprecated in Zod 4 — `auth.schema.ts` L9–33.
- bcrypt only hashes 72 bytes but schema allows 128 — `auth.schema.ts` L13/58/76.
- Business constants and test helpers in a repository file; file name breaks module convention — `login-verifications.repository.ts` L69, L130–145, L225–229.
- Untrusted `x-request-id` echoed and stored — `middleware/request-context.ts` L5–6.
- CORS `credentials: true` unnecessary with bearer auth — `app.ts` L30.
- JSON parsed before rate limiter — `app.ts` L33–34.
- `AppError.code` typed `ErrorCode | string`; ad-hoc codes (`USER_NOT_FOUND`, `TASK_NOT_FOUND`); no `PAYLOAD_TOO_LARGE`/`tooManyRequests` — `errors/app-error.ts` L5, `error-codes.ts`.
- `notFound` without domain codes — `specializations.service.ts` L60, `feedback.service.ts` L78, `contact.service.ts` L57/86/115/134/140.
- Zod 4 deprecated `flatten()` — `error.middleware.ts` L49.
- Logger redaction gaps (nested headers, `code`, `email`); `createChildLogger` unused — `logging/logger.ts` L5–28.
- Full URLs with query strings in access logs — `middleware/request-logger.ts` L50–58; log-only mailer logs recipient emails.
- Mail `from` built by string interpolation; `MAIL_MAILER` unused — `mail/mailer.ts` L43.
- Signed download URLs: no TTL clamp, no `Content-Disposition`, Arabic filenames reduced to underscores — `storage/storage.service.ts` L148–156, `storage/keys.ts` L9.
- `deleteObjects` ignores per-object errors — `storage.service.ts` L201–219.
- Task storage cap race between read and presign — `tasks.service.ts` L227–248. ✅ (partial: cap re-checked at confirm time in `resolveUploadedObject`; two simultaneous confirms can still both pass)
- Health module missing `index.ts`; `health.schema.ts` unused; repository swallows ping error — `modules/health/*`.
- Unused config fields (`appUrl`, `supabaseAnonKey`, `databaseUrl`, `mailer`, `geminiApiKey`, `huggingfaceApiKey`); `CORS_ORIGINS` read from raw env — `config/index.ts` L260–295.
- Tooling: `scripts/` not type-checked; `tests/` compiled into `dist/`; `pg` is a runtime dep used only by scripts — `tsconfig.json` L13, `package.json` L43.
- Seed lists duplicated; e2e seed has no `super` — `scripts/e2e-server.ts` L22–32 vs `seed-users.ts` L15–41.
- Invoice PDF silently falls back on bad currency — `pdf/invoice-pdf.ts` L20–26.
- `lastError` (internal S3/SMTP messages) exposed to clients in `InvoiceSummary` — `invoices.types.ts` L27/52.
- FX fallback answers with `from:'USD', to:'USD'` instead of the requested codes — `fx.service.ts` L56–66.
- `fx` "repository" is an HTTP client, not DB access (naming deviation; acceptable but document it).
- Logging record types live in `logging.repository.ts` L6–85 instead of `logging.types.ts`; logging uses `Date` while all other modules use ISO strings.
- Row mapper naming varies (`toTask`, `toRecord`, `fromRow`, `fromPaymentRow`, `toLead`).
- Dead code ✅ (partial: `ListLogsQuery` removed; the rest remain): `revisionStatusSchema` (`revisions.schema.ts` L3–8/44), `InvoiceIdParams` (`invoices.schema.ts` L7), `rbacRepository.findPermissionById` (L372–381), `usersService.getUserById` (L82–84), `loggingService.recordError` (L31–37), `memoryPaymentsByTaskId` + TODO (`tasks.repository.ts` L219–220), redundant client check in `payments.assertCanView` (L134–136), duplicated `isSystem` check in rbac service + repository.
- Backend tests are noisy (pino logs) — set `LOG_LEVEL=silent` in test setup.

### 4.2 Database

- Enum spelling mixed: `'in-progress'`/`'in-revision'` vs `'waiting_coordinator_approval'`; `payment_status 'canceled'` vs task `'cancelled'` — `001_extensions_and_enums.sql`. Document in a shared constants file; rename only with `ALTER TYPE … RENAME VALUE` before data grows.
- Legacy/unused schema: `010_legacy_optional.sql` (`messages`, `assignment_transactions`), `users.remember_token`, `users.permissions jsonb` (dup of `user_permissions`), `tasks.feedback` (dup of `feedbacks`), `tasks.is_assigned` (derivable).
- `stay_updated` non-plural, `files` generic, columns named `date`/`key`.
- `payment_logs` has `updated_at` + trigger while other append-only logs don't; `set_updated_at()` lacks `SET search_path` (Supabase linter).
- Possible missing uniques: `specializations (tutor_id, name)`.

### 4.3 Web — shared & portals

- Single-flight refresh can stick on early `return false` outside `try/finally` — `services/api.ts` L82–86; redundant refresh after concurrent 401s (L137–152); no concurrent-401 test.
- Header merging drops `Headers` instances; `Content-Type` sent on GET/DELETE — `api.ts` L129–133.
- `apiDownload` revokes object URL synchronously and ignores `Content-Disposition` — `api.ts` L193–199. ✅ (partial: reads the `Content-Disposition` filename; `saveBlob` still revokes immediately after `click()`)
- Presigned upload throws plain `Error` — `services/tasks.ts` L217–224. ✅ (now `ApiError` for storage, network and abort errors)
- Dead `services/logging.ts` (zero importers, imports the store directly); unused `refresh`/`refreshTokens` in `services/auth.ts` L45–47, `api.ts` L174–177.
- Inconsistent list response shapes (`{data, meta}` vs `{data}` vs bare arrays in `listTaskFiles`/`listTaskSolutions`) — backend + `services/*`.
- DTO naming mixed (`FeedbackRecord`/`PaymentRecord` vs `Task`/`ManagedUser`; `*Payload` vs `Create*Input`; `body` vs `input` params; `FileDownload` vs `InvoiceDownload`).
- Presentation helpers in `services/` (`taskStatusLabel`, `revisionStatusLabel`, `userDisplayName`); display-name logic reimplemented in `PortalShell.tsx` L29–37 and `ProfilePage.tsx` L17; initials in `avatar.tsx` and `PortalShell.tsx`.
- Toast: always `role="status"` (errors should be `alert`), no dismiss, fixed 3.2 s — `components/ui/toast.tsx`. ✅ (urgent toasts use `role="alert"`, dismiss button, per-variant duration)
- Tooltip lacks `aria-describedby` and Escape — `components/ui/tooltip.tsx`.
- StarRating: every star is a tab stop, no roving tabindex — `components/ui/star-rating.tsx` L46–62.
- One Escape closes all nested overlays — `components/ui/use-overlay.ts` L66–91.
- `Dialog` has no `size`/`className` (fixed `max-w-md`) — `dialog.tsx`. ✅ (partial: `size?: 'md' | 'lg'` added; no `className`)
- `Button`/`Input`/`Select`/`Textarea` don't accept `ref` (use `ComponentProps<'button'>` in React 19).
- Hardcoded colors/z-indexes — `button.tsx` L14–18, `PortalShell.tsx` L97 (`focus:ring-black`), L109/192/292/301; `navigation-loader.tsx` L43. ✅ (partial: overlays and the loader now use `zIndex` tokens; `PortalShell` z-values/`focus:ring-black` and `button.tsx` rgba remain)
- `AccountMenu` declares `role="menu"` without keyboard pattern — `PortalShell.tsx` L47–143.
- `ErrorBoundary` doesn't reset on navigation — `components/errors/ErrorBoundary.tsx` L29–31.
- Persisted role never revalidated after hydration (call `getMe()` once).
- Retry via `window.location.reload()` — `ProfilePage.tsx` L128, `PortalDashboardPage.tsx` L141/151. ✅ (retries now go through `useAsyncData` `reload()`)
- Physical direction utilities in portals/auth (LTR today, but rule says logical): `text-left/right` in every admin table, `ml-2`, `pr-10`/`right-2`, `PortalShell.tsx` L94–193, `AuthCard.tsx` L23–25.
- Table header styles differ (`bg-muted/40` normal-case vs uppercase `px-2 py-3` vs `bg-muted/50`); Cancel/Export variants `outline` vs `secondary`; footer button sizes `sm` vs default; submit buttons in `footer` vs form body. Fix: `DataTable` shell + one button rule.
- Responsive: `TasksPage` table `min-w-full` without minimum width; `RegisterPage.tsx` L62 `grid-cols-2` at all widths.
- A11y: unlabeled status `Select` (`TasksPage.tsx` L210–220), empty `<th>`, `DetailRow` labels without `htmlFor`, icons without `aria-hidden`, `td.truncate` without `table-fixed` (`FeedbackPage.tsx` L341).
- Form nits: `rbac.schema.ts` L14/20 `z.coerce.number()` turns blank into 0; dashboard forms never clear `fieldErrors`; coordinator create form silently sends `type: 'assignment'`; `ResetVerifyPage` lowercases email on resend only; `LeadsPage.tsx` L61 sets `dialCode('+')`; admin "create contact message" calls the public endpoint (`ContactMessagesPage.tsx` L85).
- `PaymentFormDialog`/`SimulatedCheckoutDialog` reset when `due` changes while open.
- `useTaskDetails` returns raw service functions; `TaskDetailsDialogs.tsx` takes 26 props.
- Option lists duplicated: task types ×3, roles ×3; payment/refund statuses shown as raw enum text (`TaskPaymentsPage.tsx` L360/452). ✅ (partial: roles centralized in `ROLE_OPTIONS`; task types and raw payment/refund status text remain)
- Hardcoded "25 MB" upload limit text — `useTaskDetails.ts` L237.
- `FeedbackPage.tsx` L166 uses global `React.FormEvent`.
- Schema file/export naming: `login.schema.ts`, `password-reset.schema.ts`, `task-form.schema.ts` vs `users.schema.ts`, `payments.schema.ts`; exports `createTaskFormSchema`, `checkoutSchema(due)`. Fix: `<feature>.schema.ts` + `<action><Entity>Schema`.
- File naming mixed in `components/` (kebab in `ui/feedback/layout/forms`, Pascal in `auth/brand/errors`; `use-overlay.ts` vs `useDocumentTitle.ts`); `PortalLayouts.tsx` exports one `PortalLayout`; `adminListUtils.tsx` holds only `IconAction`. ✅ (partial: `IconAction` moved to `components/ui/icon-action.tsx`; naming mix and `PortalLayouts.tsx` remain)
- Barrels: `components/ui/index.ts`, `hooks/index.ts`, `stores/index.ts` unused while `feedback/forms/layout` barrels are used — pick one rule. ✅ (partial: `@/hooks` now used; `ui` and `stores` barrels still unused)
- Dead code/assets ✅ (partial: `src/assets/react.svg`, `vite.svg`, `hero.png`, `public/favicon.svg` removed; the rest remain): `src/App.css` (182 lines, never imported), `public/icons.svg`, `features/portals/PortalHomePage.tsx`, `features/shared/comingSoon.ts`, `PortalDefinition.description`, unused `STAFF_ROLES`/`SUPER_ROLES`/`ADMIN_ROLES`/`hasAnyRole` wrapper in `lib/permissions.ts`; placeholder UI in `ProfilePage.tsx` L301–314, `ManageUserProfilePage.tsx` L365–378; duplicated exports card (dashboard vs profile).
- `@types/react-router-dom@5` alongside React Router 7 — `web-app/package.json` L38.
- Zod 4 deprecated `flatten()` — `web-app/src/lib/form.ts` L32.
- Tailwind leftovers: `@custom-variant dark` + `.dark {}` block unused (`index.css` L3, L102–135); v3 names `bg-gradient-to-*`, bare `shadow`.
- Files > 300 lines to split along existing patterns (current counts): `TaskPaymentsPage.tsx` (598), `useTaskDetails.ts` (551, was 361), `ManageUsersPage.tsx` (513), `ManageUserProfilePage.tsx` (489), `TasksPage.tsx` (417), `FeedbackPage.tsx` (402), `PortalDashboardPage.tsx` (391, was 504), `ActivityLogsPage.tsx` (388), `ContactMessagesPage.tsx` (336), `PortalShell.tsx` (324), `ManageRbacPage.tsx` (321), `ProfilePage.tsx` (317), `RevisionDetailsPage.tsx` (303). `TaskDetailsPage.tsx` is the model to follow.

### 4.4 Web — public & i18n

- `uppercase`/`lowercase` on translated text: `ServicesPage.tsx` L138; `AboutPage.tsx` L141/152/193/366; `LegalPage.tsx` L49 → `ltr:uppercase ltr:tracking-wide`.
- `leading-none` on Arabic text: `ServicesPage.tsx` L545, `LanguageSwitcher.tsx` L42; display text as `<p>` outside heading rule: `FeaturesSection.tsx` L44.
- Text gradients `bg-gradient-to-br` not mirrored: `ServicesPage.tsx` L120/419, `AboutPage.tsx` L75, `HeroSection.tsx` L41.
- Non-mirrored decorative rotations/radials: `AboutPage.tsx` L45–50/L149, `HeroSection.tsx` L26–28, `ProcessSection.tsx` L24–26, `home.css` L7–15.
- Code input missing `rtl:text-end` — `LeadModal.tsx` L162–169.
- `--dir` not reset inside nested `dir="ltr"` islands — `index.css` L150–152 (add `[dir='ltr'] { --dir: 1; }`); heading rule excludes `h4–h6`.
- 404 "Back home" uses `<Link to="/">` — `NotFoundPage.tsx` L17.
- `localizePath('#x')` → `/en#x`; `LocalizedLink` doesn't guard already-prefixed paths — `i18n/paths.ts` L9–13, `LocalizedLink.tsx` L8–11.
- Mostly unreachable outer `*` route; `/AR/about` 404s — `App.tsx` L92.
- Country selection keyed on English display name — `LeadModal.tsx` L36/59/120, `countries.ts`.
- React keys from translated text across home/public sections and `LegalPage.tsx` L77/91.
- Weak English nav aria-labels (`'Public'`, `'Public mobile'`) — `public/i18n/en.ts` L10–11.
- Brand spelled `OriginaliQ` vs `Original IQ`; JSX literal in `AboutPage.tsx` L76.
- Duplicated copy: `title`/`overlayTitle` both "Why Choose Us"; `paymentBadge`/`paymentTitle` both "Payment Methods".
- English schema instances exported at module level (`lead.schema.ts` L21–23, `contact.schema.ts` L34–39) — export types only.
- Field limits duplicated across schema/JSX/messages; name max 20 too tight — `contact.schema.ts`, `ContactPage.tsx` L198–243.
- Contact schema factory called twice per page — `ContactPage.tsx` L32–35.
- Unisolated prices in Arabic aria-label — `public/i18n/ar.ts` L226 (wrap with `ltr()`).
- Stat values forced LTR (`500+` vs Arabic `+500`) — confirm intent.
- `RichText` links only first email occurrence — `LegalPage.tsx` L21–23; FAQ emails/phones not linked.
- Index numerals/year bypass formatter (acceptable; optional `formatNumber`).
- Animations implemented three ways + per-page CSS files (`home.css`, `about.css`, arbitrary `[animation-delay]`, inline styles) — move keyframes into `index.css @theme`.
- Decorative floating shapes implemented three times — one `DecorShapes` component.
- Hardcoded `rgba(52,184,193,…)`, `bg-white/90` instead of tokens in Hero/Process/HowItWorks/About.
- `features/home/content.ts` holds only a container class (misnamed).
- Reversed `<dt>/<dd>` — `HeroSection.tsx` L66–73; empty `<dt>` — `AboutPage.tsx` L135.
- WhatsApp button only on Home and overlaps toasts — `WhatsAppButton.tsx` L14 vs `toast.tsx` L53.
- Client-only `hreflang`, emitted on 404s, `x-default` → `/en` — `LocaleGate.tsx` L25–42.
- Heavy infinite decoration on mobile (`home-spin`, marquee, `backdrop-blur`).
- Hash scroll runs before images load; same-hash click doesn't re-scroll — `useHashScroll.ts`.
- Uncleared `setTimeout` — `AboutPage.tsx` L61.
- Arabic country search lacks normalization and locale collation — `LeadModal.tsx` L38–46, `countries.ts`.
- Arabic avatar initials always end in «ا» — `components/ui/avatar.tsx` L20–24.
- FAQ fake tabs without `tabpanel`/keyboard — `FaqPage.tsx` L29–42 (reuse `components/ui/tabs.tsx`).
- Marquee has no pause control (WCAG 2.2.2) — `TestimonialsSection.tsx`, `home.css` L84–86.
- File roles/naming: `pages.tsx` barrel, `policyPages.tsx`, mixed folder-per-page (`contact/`, `services/` vs root files); dictionary hook patterns differ (`useContactText`, `useServices`, `usePublicDictionary().about`); `home` ↔ `public` import each other (`HomePage.tsx` L5 ↔ `publicRoutes.tsx` L4); legal ids `force_majeure` vs `force-majeure`.

### 4.5 Repo hygiene & config

- Root `.gitignore` credentials rule doesn't match (brackets are glob classes) — escape as `Docs/\[1\] Main App/\[5\] Credentials/**` (the nested `.gitignore` is what protects it today).
- Template leftovers in `.prettierignore` (`civil-mobile`, `.expo`, `android/ios`) and `.editorconfig` (`mobile`, `[*.prisma]`); add `web-app/test-results`, `playwright-report`.
- `backend/supabase/` entirely untracked — decide on CLI usage (see M42). ✅ (partial: 20 files now tracked; its copies of 019–023 are not)
- `.gitkeep.md` placeholders in `backend/tests/e2e` and `web-app/tests/e2e` are stale (web has 4 specs; backend note mentions a test Postgres, contradicting CI decision doc).
- Test file naming mixed (`payments-invoices.test.ts`, `homePath.test.ts`, `api.refresh.test.ts`).
- CI e2e doesn't upload artifacts on failure; `npm audit --audit-level=critical` is lenient.
- `DATABASE_URL` missing from `backend/.env.example`; `GEMINI_API_KEY`/`HUGGINGFACE_API_KEY` parsed but unused. ✅ (partial: `DATABASE_URL` documented (commented); AI keys still parsed but unused)
- Verify `bcrypt` (native) and `pdfkit` (font files) in a Vercel preview build.

---

## 5. What is already consistent (keep doing this)

- Backend composition: factory functions per layer, `createXModule(config)` barrels, `respond()` controllers, `AppError` helpers, `{ code, message, details? }` error envelope, `{ data, meta: { page, limit, total } }` lists, Zod `validate()` → `authenticate` → `authorize()` at the route.
- Web: single `apiRequest`/`apiDownload` wrapper; no `fetch`/Supabase outside `services/` (except the legitimate presigned upload); no `any`; named exports; `parseForm` + `Field`/`FieldError`; shadcn-style UI kit with shared `useOverlay` (focus trap, Escape, scroll lock); Tailwind v4 CSS-first config.
- Public i18n: logical utilities only, direction-aware gradients/keyframes, flipped directional icons, `Sheet side="end"`, toasts at `end-4`, `ar` typed as `typeof en`, memoized schema factories, `LanguageSwitcher` preserves path/query/hash, legal section ids aligned.
- Secrets: `.env`, credentials, and Supabase temp files are git-ignored; `.env.example` files contain placeholders only. No `dangerouslySetInnerHTML`; `window.open` uses `noopener,noreferrer`.

---

## 6. Prioritized fix plan

### Phase 0 — Security emergencies (do first, small changes)

1. Enable RLS on all tables (C1).
2. Block admin → super escalation in `users.service` + filter role options in UI (C2). ✅
3. Production config guards: require Supabase + strong JWT secrets, reject simulated payments, `TRUST_PROXY` (C4, H7, H8). ✅ (partial — JWT secrets + `TRUST_PROXY` done; Supabase/payment-mode guards (C4) remain)
4. Guard `seed-users.ts` / `seed-rbac.ts` by environment (C6, M40).
5. Send password-reset email; stop logging codes (C5).
6. Lock down staff `PATCH /tasks/:id` fields (H1). ✅
7. Fix feedback forging, revision solution IDOR, manual-payment `userId` (H2, H3, H4). ✅
8. CSV formula escaping (H5). ✅

### Phase 1 — Money & data integrity

1. Refund cap + audit trail; single currency rule; atomic check-and-insert RPC (H9–H11). ✅
2. Revision lifecycle guards + partial unique index (H12). ✅
3. Conditional status updates + atomic `nbDone` (M4, M5); status guards on cancel/assign (M5).
4. Change cascading deletes to `RESTRICT` / soft delete (H13) — after decision. ✅ (`RESTRICT`, migration 022)
5. Shared `mapDbError()` so DB conflicts return 409/400 instead of 500 (M15); `.uuid()` params (M16). ✅ (partial — FK `23503` → 409 only)
6. OTP attempt limit + hashed codes; atomic code consumption (H6, M21). ✅ (partial — H6 done; M21 atomic consumption remains)
7. Commit `014_invoices.sql` (H17); add indexes and money CHECKs (M43, M45). ✅ (partial — 014 committed, currency CHECK added; indexes, amount/price CHECKs remain; commit 019–023)

### Phase 2 — Production readiness

1. Vercel config for both apps + security headers/CSP (H30, C3 partial). ✅ (partial — root `vercel.json` added; headers/CSP remain)
2. Refresh-token rotation/revocation; stop persisting the access token (C3). ✅ (partial — revocation + 7-day sessions done; access token still persisted)
3. Fix `.env.example` boot crash (H14); malformed JSON 400 (H15); `headersSent` guard. ✅
4. `createAuthenticate(config)`; move `assertDeletable` out of `v1.ts` (H28, H29).
5. Async invoice issuance + SMTP timeouts (H26); paginated/streamed exports, real counts (H27). ✅ (partial — `selectAllRows` for analytics/backups; H26, task stats and exports remain)
6. Make CI green (H31); add `build` to CI (M96); Node 22 pin (M94); `.gitattributes` (M97). ✅ (partial — lint green; Prettier fails on 2 files; M94/M96/M97 remain)

### Phase 3 — User-facing bugs

1. Web dialog/save bugs: `runAction` boolean, payment details error state, user name pre-fill, rating ≥ 1, dashboard error handling (H18–H22). ✅
2. Scroll reset + hash-scroll fixes + LTR flash (H23, M80, M81). ✅ (partial — H23 done; M80, M81 remain)
3. Feedback search 500 (H16). ✅
4. Refresh logout on network error; error normalization; auth store hydration; cross-tab sync (M47–M50). ✅ (partial — network errors normalized (M48); M47, M49, M50 remain)
5. English leaks on Arabic pages; Arabic line-height (M78, M79).

### Phase 4 — Shared building blocks (unlocks most consistency fixes)

1. Web: `lib/format.ts` (money/date), `lib/permissions.ts` capabilities, `hooks/usePagedList.ts` + `components/ui/pagination.tsx`, `confirm-dialog.tsx`, `icon-button.tsx`, `switch.tsx`, `stat-card.tsx`, `password-input.tsx`, `usePortal()`; `Dialog` `size` + `dismissible`.
2. Backend: `_shared/money.ts`, `_shared/search.ts`, `_shared/list-meta.ts`, `authz` `isPlatformAdmin` + `canManageTask`, `database/db-errors.ts`.
3. Public: `siteInfo.ts`, `PUBLIC_PAGES` registry, `formatPrice`, `SectionHeader`/`PageHero`/`GradientBanner`.

### Phase 5 — Consistency refactors

1. Move the seven pages onto `PortalPageShell`; one loading/error pattern; Zod for every form (M63, M65, M66).
2. Convert auth/rbac/specializations/logging/exports controllers to `respond()`; unify activity logging (M25, M26).
3. Standardize module factories and mounting; inject service ports instead of foreign repositories (M27, M28, M29, M30).
4. Theme: `index.css @theme` as single source, add success token, delete unused TS tokens; toast z-index (M74, M75).
5. Split files > 300–400 lines along the `TaskDetailsPage` pattern.
6. Code splitting + image optimization (H24, H25).
7. Consolidate migrations to `backend/migrations/` only; migration tracking (M41, M42).

### Phase 6 — Tests, docs, cleanup

1. Backend: revisions/feedback/exports service tests; route-level role-matrix tests (H32). ✅ (partial — service tests added; role-matrix integration tests remain)
2. Web: task/payment hook and schema tests; one e2e payment journey (H33).
3. Delete dead code and template leftovers (§4.3 dead code list).
4. Update `README.md`, `Libraries.md`, CI decision doc, DB README, `schema.dbml`; align role-casing wording in rules (M98).

---

## 7. Needs discussion before implementing

- **Refresh token transport:** `httpOnly` cookie (requires CORS `credentials`, CSRF consideration) vs body + in-memory access token.
- ✅ Decided — **Rate limiting store without Redis:** Supabase-backed counters for auth limiters (`rate_limit_hits`, migration 019); general limiter stays per-instance.
- ✅ Decided (partly) — **Deletion policy:** `RESTRICT` on financial FKs (migration 022). Still open: soft delete / deactivation for users and tasks.
- ✅ Decided (partly) — **Money representation:** USD-only ledger (migration 020). Still open: integer minor units vs `numeric` + JS floats.
- **Invoice correction policy:** void/supersede vs delete-and-renumber.
- **RBAC:** enforce permission tables at runtime, or document as catalog-only.
- **Supabase CLI vs `scripts/apply-migrations.ts`:** pick one migration mechanism.
- **In-memory repositories:** keep in `src/` for local dev or move to `tests/`.
- **`tailwind-merge`:** adopt (new dependency) vs variant-prop discipline.
- **Role casing:** keep lowercase in code/DB and update rule docs (recommended).
- **Register enumeration policy:** keep 409 with email-keyed limiting vs "check your email" flow.
- **Node 22 LTS** upgrade and `bcrypt` vs `bcryptjs` on Vercel.
