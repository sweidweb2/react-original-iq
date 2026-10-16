# 03 — Domain Model & Data Dictionary

Stack-agnostic target model. Field types are logical; map to your new ORM/DB as you like.

## ER overview (text)

```
User 1──* Task (as client)
User 1──* Task (as tutor, optional)
User 1──* Task (as coordinator, optional)
Task 1──* File
Task 1──* Solution
Task 1──* RevisionSession
Task 1──* Payment
Task 1──* Refund
Task 1──* Feedback
Solution 1──* RevisionSessionSolution *──1 RevisionSession
Payment 1──* PaymentLog
Payment 1──1 Invoice
User 1──* Specialization (tutors)
User 1──* LoginVerification
LoginAttempt (by email/ip, not strictly FK)
Lead, StayUpdated, ContactMessage (standalone)
Message, AssignmentTransaction (legacy / unused product paths)
```

---

## User

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| name | string | |
| email | string unique | |
| password | hashed | |
| role | string | `super` \| `admin` \| `coordinator` \| `tutor` \| `client` |
| phone | string? | |
| email_verified | bool | default false |
| email_verified_at | datetime? | |
| permissions | json/array? | admin fine-grained keys |
| is_active | bool | default true |
| last_login_at | datetime? | |
| nbDone | int | tutor completed count |
| punctuality | float | tutor metric |
| quality | float | tutor metric |
| perfection | float | tutor metric |
| avgratingstar | float | tutor metric |
| start_date | date? | tutor |
| remember_token | string? | |
| timestamps | | |

**Relationships:** clientTasks, tutorTasks, coordinatorTasks → Task; specializations → Specialization.

**Rebuild note:** drop unused `user_type` unless you need it for migration compatibility.

---

## Task

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| client_id | FK → User | cascade on delete |
| tutor_id | FK? → User | set null |
| coordinator_id | FK? → User | set null |
| topic | string? | |
| type | string? | `assignment` \| `tutoring` \| `research` \| `editing` |
| desc | text? | |
| is_assigned | bool | default false |
| status | string | see lifecycle doc; default `pending` |
| deadline | datetime? | |
| price | decimal(8,2) | default 0 |
| payment_status | string | default `unpaid` |
| category | string? | |
| feedback | text? | legacy/extra field on task |
| allow_view | bool | client solution visibility; default false |
| timestamps | | |

**Relationships:** client, tutor, coordinator; files, solutions, revisionSessions, payments, refunds.

**Statuses (canonical):** `pending`, `in-progress`, `waiting_coordinator_approval`, `completed`, `cancelled`

**Payment statuses (canonical runtime):** `unpaid`, `paid`, `refund_pending`  
(Legacy validation also mentions `pending`, `refunded` — normalize in rebuild.)

---

## File (client / task documents)

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| task_id | FK → Task | cascade |
| file_location | string | storage URL or key |
| note | string? | present in DB; weakly used |
| timestamps | | |

---

## Solution (tutor deliverables)

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| task_id | FK → Task | cascade |
| file_location | string | |
| timestamps | | |

---

## RevisionSession

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| task_id | FK → Task | |
| start_date | datetime? | set on create |
| deadline | datetime? | |
| submit_date | datetime? | set on approve |
| status | string | default `in-revision` |
| title | text? | |
| description | text? | |
| timestamps | | |

**Statuses:** `in-revision`, `waiting_coordinator_approval`, `completed`, `cancelled`

---

## RevisionSessionSolution

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| revision_session_id | FK | |
| solution_id | FK → Solution | |
| date | datetime? | |
| timestamps | | |

---

## Payment

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| task_id | FK → Task | |
| user_id | FK → User | payer (client) |
| amount | decimal(10,2) | |
| currency | string | default `USD` |
| gateway | string | default `montypay`; manual uses `No Gateway` |
| montypay_transaction_id | string? | unique for idempotency |
| status | enum | `pending` \| `paid` \| `failed` \| `canceled` \| `refunded` |
| payment_url | string? | |
| payment_method | string? | |
| callback_payload | json? | |
| timestamps | | |

---

## PaymentLog

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| payment_id | FK | |
| event | string | |
| payload | json? | |
| timestamps | | |

---

## Refund

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| task_id | FK | |
| refunder_id | FK → User | who issued |
| amount | decimal(10,2) | |
| refund_reason | string? | |
| currency | string | default USD |
| gateway | string | |
| montypay_transaction_id | string? | |
| status | enum | same as payment |
| payment_url | string? | |
| payment_method | string? | |
| callback_payload | json? | |
| timestamps | | |

---

## Invoice

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| payment_id | FK → Payment | |
| invoice_number | string? | e.g. `INV-000123` |
| invoice_date | datetime/string? | |
| invoice_status | string? | `sent` \| `failed` |
| pdf_path | string? | storage path |
| timestamps | | |

---

## Feedback

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| task_id | FK | |
| tutor_id | FK → User | |
| client_id | FK → User | |
| rating | unsigned int? | |
| comments | text? | |
| suggestions | text? | |
| timestamps | | |

---

## Specialization

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| name | string | |
| tutor_id | FK → User | cascade |
| note | string? | |
| timestamps | | |

---

## Lead

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| first_name | string? | |
| last_name | string? | |
| phone | string? | |
| email | string? | |
| country | string? | |
| zip | string? | |
| timestamps | | |

---

## StayUpdated (newsletter)

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| email | string | unique in practice |
| timestamps | | |

Table name: `stay_updated`.

---

## ContactMessage

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| name | string | |
| email | string | |
| subject | string? | |
| message | text | |
| timestamps | | |

---

## LoginAttempt

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| email | string | |
| ip_address | string(45) | |
| user_agent | string? | |
| success | bool | |
| failed_attempts | int | |
| locked_until | datetime? | |
| last_attempt_at | datetime? | |
| timestamps | | |

Indexes: `(email, ip_address)`, `locked_until`.

---

## LoginVerification

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| user_id | FK → User | |
| code | string(6) | |
| type | string | default `email`; also `password_reset` |
| expires_at | datetime | +10 minutes from create |
| used | bool | |
| used_at | datetime? | |
| timestamps | | |

---

## ActivityLog (platform audit)

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| user_id | FK? → User | actor; set null on delete |
| action | string | e.g. `auth.login`, `users.create` |
| entity | string? | |
| entity_id | string? | |
| meta | json? | |
| ip | string? | |
| request_id | string? | |
| created_at | datetime | |

**Companion:** `error_logs` for persisted 5xx / unhandled errors (super/admin read).

---

## Optional / legacy entities

### Message (unused UX)
`sender_id`, `receiver_id`, `subject?`, `content`, `status` default `unread`, `read_at?`

### AssignmentTransaction (unused writes)
`task_id`, `coordinator_id?`, `tutor_id?`, `type` (`assigned` \| `reassigned` \| `completed` \| `cancelled`), `date`

Supporting infra tables (framework): `sessions`, `password_reset_tokens`, `cache`, `jobs`.

---

## Derived / computed concepts

| Concept | Formula / rule |
|---------|----------------|
| Net paid on task | `sum(payments.amount) - sum(refunds.amount)` |
| Amount still needed | `price - totalPayments + totalRefunds` |
| Overpay amount | `(totalPayments - totalRefunds) - price` |
| Tutor `nbDone` | Incremented when task approved / completed |

## Recommended cleanups for new schema

1. Single role column; drop `user_type`.
2. Use real enums / check constraints for task status, payment_status, revision status.
3. Make `Feedback.tutor_id` required and consistent in model layer.
4. Store storage **keys** not only full URLs (easier migration).
5. Add unique constraint on `payments.montypay_transaction_id` where not null.
6. Decide whether to keep `messages` / `assignment_transactions` at all.
