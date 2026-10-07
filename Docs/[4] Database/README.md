# Database

**Provider:** remote Supabase (PostgreSQL)  
**ER diagram:** [`schema.dbml`](./schema.dbml) → open in [dbdiagram.io](https://dbdiagram.io)  
**Migrations:** [`migrations/`](./migrations/) (run in order)

## Migration order

| File | Contents |
| --- | --- |
| `001_extensions_and_enums.sql` | pgcrypto, enums, `set_updated_at` |
| `002_users.sql` | `users` |
| `003_tasks.sql` | `tasks` |
| `004_files_and_solutions.sql` | `files`, `solutions` |
| `005_revisions.sql` | `revision_sessions`, `revision_session_solutions` |
| `006_payments.sql` | `payments`, `payment_logs`, `refunds`, `invoices` |
| `007_feedback_and_specializations.sql` | `feedbacks`, `specializations` |
| `008_leads_and_contact.sql` | `leads`, `stay_updated`, `contact_messages` |
| `009_login_security.sql` | `login_attempts`, `login_verifications` |
| `010_legacy_optional.sql` | `messages`, `assignment_transactions` (optional) |

## Apply on Supabase

**Option A — SQL Editor (simplest)**  
1. Open Supabase → **SQL Editor**  
2. Paste [`migrations/APPLY_ALL.sql`](./migrations/APPLY_ALL.sql) (or run `001`…`010` one by one)  
3. Run  

**Option B — script (from repo)**  
```bash
cd backend
npx tsx scripts/apply-migrations.ts
```

Requires `DATABASE_URL` in `backend/.env`. Use the **pooler** URI from Dashboard → Database → Connect if `db.<project>.supabase.co` fails DNS.

## Naming cleanups (vs legacy)

| Domain field | DB column |
| --- | --- |
| `password` | `password_hash` |
| `desc` | `description` |
| `nbDone` | `nb_done` |
| `avgratingstar` | `avg_rating_star` |
| task status `in-progress` | enum value `in-progress` |
| revision `in-revision` | enum value `in-revision` |

Roles: `admin` \| `coordinator` \| `tutor` \| `client` (no `user_type`).

## API access

Express repositories use `@supabase/supabase-js` with the service role.  
Do not expose the service role to the React app.
