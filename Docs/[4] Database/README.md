# Database

**Provider:** remote Supabase (PostgreSQL)  
**ER diagram:** [`schema.dbml`](./schema.dbml) → open in [dbdiagram.io](https://dbdiagram.io)  
**Migrations (SQL):** [`backend/migrations/`](../../backend/migrations/) — run in order

This folder holds the **DBML reflection** of the schema. Executable migrations live under `backend/migrations/`.

## Migration order

| File                                   | Contents                                                                                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001_extensions_and_enums.sql`         | pgcrypto, enums, `set_updated_at`                                                                                                                                             |
| `002_users.sql`                        | `users`                                                                                                                                                                       |
| `003_tasks.sql`                        | `tasks`                                                                                                                                                                       |
| `004_files_and_solutions.sql`          | `files`, `solutions`                                                                                                                                                          |
| `005_revisions.sql`                    | `revision_sessions`, `revision_session_solutions`                                                                                                                             |
| `006_payments.sql`                     | `payments`, `payment_logs`, `refunds`, `invoices`                                                                                                                             |
| `007_feedback_and_specializations.sql` | `feedbacks`, `specializations`                                                                                                                                                |
| `008_leads_and_contact.sql`            | `leads`, `stay_updated`, `contact_messages`                                                                                                                                   |
| `009_login_security.sql`               | `login_attempts`, `login_verifications`                                                                                                                                       |
| `010_legacy_optional.sql`              | `messages`, `assignment_transactions` (optional)                                                                                                                              |
| `011_rbac.sql`                         | `roles`, `permissions`, `role_permissions`, `user_permissions`                                                                                                                |
| `012_activity_logs_and_super.sql`      | `activity_logs`, `error_logs`, `user_role.super`                                                                                                                              |
| `013_file_metadata.sql`                | `files`/`solutions` original_name, content_type, size_bytes                                                                                                                   |
| `014_invoices.sql`                     | `invoice_number_seq`, `invoices.invoice_seq`, `sent_at`, `last_error`, unique invoice number                                                                                  |
| `015_auth_sessions.sql`                | `auth_sessions` (refresh-token sessions)                                                                                                                                      |
| `016_backup_history.sql`               | `backup_history`                                                                                                                                                              |
| `017_error_logs_source.sql`            | `error_logs.source`, `level`, `meta`                                                                                                                                          |
| `020_money_integrity.sql`              | USD-only `payments`/`refunds`; locked `create_task_payment`, `update_task_payment`, `create_task_refund`                                                                      |
| `021_revision_open_unique.sql`         | one open `revision_sessions` row per task (partial unique index)                                                                                                              |
| `022_financial_fk_restrict.sql`        | `ON DELETE RESTRICT` for `users → tasks` and `tasks → payments/refunds`                                                                                                       |
| `025_invoice_void_and_number.sql`      | generated `NOT NULL` `invoice_number`; invoice `amount`/`currency` snapshot; `voided_at`/`void_reason` (one non-voided invoice per payment); `payments → invoices` `RESTRICT` |

## Apply on Supabase

**Option A — SQL Editor (simplest)**

1. Open Supabase → **SQL Editor**
2. Paste [`backend/migrations/APPLY_ALL.sql`](../../backend/migrations/APPLY_ALL.sql) (or run `001`…`010` one by one)
3. Run

**Option B — script (from repo)**

```bash
cd backend
npx tsx scripts/apply-migrations.ts
```

Requires `DATABASE_URL` in `backend/.env`. Use the **pooler** URI from Dashboard → Database → Connect if `db.<project>.supabase.co` fails DNS.

## Naming cleanups (vs legacy)

| Domain field              | DB column                |
| ------------------------- | ------------------------ |
| `password`                | `password_hash`          |
| `desc`                    | `description`            |
| `nbDone`                  | `nb_done`                |
| `avgratingstar`           | `avg_rating_star`        |
| task status `in-progress` | enum value `in-progress` |
| revision `in-revision`    | enum value `in-revision` |

Roles: `super` \| `admin` \| `coordinator` \| `tutor` \| `client` (no `user_type`).

## API access

Express repositories use `@supabase/supabase-js` with the service role.  
Do not expose the service role to the React app.
