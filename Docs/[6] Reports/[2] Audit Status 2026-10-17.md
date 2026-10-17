# Audit Status — 2026-10-17 17:00

Status snapshot of [`[1] Codebase Audit 2026-10-17.md`](./%5B1%5D%20Codebase%20Audit%202026-10-17.md). Per-item marks come from that report; the Critical and open High items, plus all verification numbers below, were re-checked against the code at 16:10. Detail and fix instructions for every ID live in the audit report.

## Summary

| Severity | Total | Done | Partial | Open |
| -------- | ----- | ---- | ------- | ---- |
| Critical | 6     | 1    | 1       | 4    |
| High     | 33    | 33   | 0       | 0    |
| Medium   | 98    | 19   | 23      | 56   |
| Low      | ~117  | 3    | 11      | ~103 |

- Money integrity and authorization are largely fixed (H1–H13 done; migrations `019`–`025`).
- The four open Criticals are all small, isolated changes and should go next.
- The audit report's own header table is stale (says High 23/5/5, Medium 2/22/74) and its "migrations `019`–`023` untracked" warning is resolved: the working tree is clean and `001`–`025` are committed.

## Verification (17:00)

| Check                    | Backend              | Web                  |
| ------------------------ | -------------------- | -------------------- |
| Typecheck                | pass                 | pass                 |
| Lint                     | pass                 | pass                 |
| Unit + integration tests | 383 / 383 (53 files) | 193 / 193 (29 files) |
| E2E (Playwright)         | —                    | 13 / 13              |

- `prettier --check .`: pass.
- CSP from `vercel.json` checked against a production build (public + auth pages): no violations.
- Migrations `015`–`025` must be applied to Supabase (`npm run db:migrate`) for the fixes to take effect there.

## Critical — still open

| ID           | Issue                                                                                                      | Verified now                                                                                             | Fix size                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| C1           | RLS off on 26 of 30 tables (only `auth_sessions`, `backup_history`, `rate_limit_hits`, `settings` have it) | No other `ENABLE ROW LEVEL SECURITY` in migrations                                                       | One migration (`026_enable_rls.sql`), deny-by-default                  |
| C3 (partial) | Sessions are revocable and CSP/security headers are set; tokens still in `localStorage`                    | `authStore.ts` `partialize` persists `tokens`                                                            | In-memory access token; cookie move needs a decision                   |
| C4           | Production can boot with simulated payments and in-memory data                                             | `PAYMENT_GATEWAY_MODE` defaults to `simulated`; `assertDeployedSecurity` checks JWT + `TRUST_PROXY` only | Extend `assertDeployedSecurity` (require Supabase, reject `simulated`) |
| C5           | Password-reset code never emailed                                                                          | `auth.service.ts` has no mailer; `shouldLogResetCode` still logs the code                                | Inject the existing `Mailer` into auth                                 |
| C6           | `seed-users.ts` resets admin passwords to `password`                                                       | No `NODE_ENV` guard; `ON CONFLICT (email) DO UPDATE SET password_hash …`                                 | Env guard + `DO NOTHING` + seed password from env                      |

C2 (admin → super escalation) is done.

## High

All 33 done (H1–H33).

## Medium

**Done (19):** M2, M3, M4, M5, M6, M10, M11, M12, M13, M14, M16, M17, M22, M25, M26, M30, M35, M49, M74.

**Partial (23):** M1, M7, M15, M18, M19, M20, M23, M24, M31, M32, M37, M38, M44, M45, M48, M51, M53, M55, M60, M65, M67, M68, M94.

**Open (56), by area:**

- Backend authz/money: M8 (RBAC not enforced), M9 (tutors see full payment detail), M21 (reset code consumption not atomic).
- Backend architecture: M27 (cross-module repository access), M28 (module factory/mounting), M29 (hidden `loadConfig()` defaults), M33 (large files — `tasks.service.ts` now 852 lines), M34 (redundant queries).
- Backend infra/DB: M36 (health probe), M39 (scripts disable TLS), M40 (`seed-rbac` wipes edits), M41 (no migration tracking), M42 (migrations in three places), M43 (missing indexes), M46 (`schema.dbml` drift).
- Web data layer: M47 (network error on refresh logs out), M50 (no cross-tab sync), M52, M54, M56, M57, M58, M59, M61, M62.
- Web UI consistency: M63 (pages bypass `PortalPageShell`), M64 (confirmations), M66 (forms without Zod), M69, M70, M71, M72 (money formatting), M73 (date formatting), M75, M76, M77.
- Public / i18n: M78–M93 (Arabic line-height, English on Arabic pages, hash scroll, LTR flash, content typing/duplication, SEO meta, marketing numbers).
- Tooling/docs: M95 (TS/ESLint strictness), M96 (CI doesn't build), M97 (`.gitattributes`), M98 (docs out of date).

## Low

~117 items; 3 done, 11 partial, the rest open. See audit report §4.

## Decisions still pending (audit §7)

Refresh-token transport (cookie vs body) · RBAC enforce vs catalog-only (M8) · Supabase CLI vs `apply-migrations.ts` (M42) · in-memory repositories in `src/` vs `tests/` (M33) · `tailwind-merge` (M77) · Node 22 LTS and `bcrypt` on Vercel (M94).

Resolved since the audit: money representation (decimal API, integer arithmetic, USD-only — M10/H10), deletion policy (`RESTRICT` — H13), invoice correction (void + reissue — M12), rate-limit store (Supabase-backed — H8), register enumeration (keep 409 — M22).

## Recommended next steps

1. **Close the Criticals:** C1 RLS migration, C4 + C6 config/seed guards, C5 reset email. All small and independent.
2. **Apply migrations `015`–`025`** to Supabase.
3. **Decide refresh-token transport** (C3), then stop persisting the access token.
4. **Quick bug fix:** M47 (logout on network error).
