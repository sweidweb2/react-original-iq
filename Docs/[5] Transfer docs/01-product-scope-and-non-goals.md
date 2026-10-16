# 01 — Product Scope & Non-Goals

## Product one-liner

**Original IQ** is a tutoring and academic-support marketplace that connects clients (students) with tutors through coordinator-managed task workflows, payments, file exchange, revisions, and feedback.

## Actors

| Actor | Description |
|-------|-------------|
| Public visitor | Browses marketing site, submits leads/contact/newsletter, uses chatbot |
| Client | Registers, creates tasks, uploads docs, pays, downloads solutions, leaves feedback |
| Tutor | Works assigned tasks, uploads solutions, submits deliveries and revisions |
| Coordinator | Owns task ops: assign tutors, price, approve/reject, revisions, limited user mgmt |
| Admin | Global oversight: users, payments/refunds, exports, leads, access toggles |

## In scope (must preserve in rebuild)

### Public / marketing
- Pages: Home, Services, About, FAQ, Contact, Terms, Privacy, Refunds policy
- Lead capture
- Contact messages
- Stay-updated (newsletter) signup
- EN / AR locales with RTL for Arabic
- Public AI chatbot (knowledge-backed)

### Core product
- Unified auth for all roles (register = client only)
- Role-based dashboards: Admin, Coordinator, Tutor, Client
- Full **task lifecycle** (create → assign → submit → approve → complete/cancel)
- **Revision sessions** with separate solution files
- **Payments** (gateway checkout + admin manual), **refunds**, **invoices** (PDF + email)
- File storage for client docs, tutor solutions, invoices
- Client feedback + tutor scoring metrics
- Tutor specializations
- Admin CSV/PDF exports
- Currency conversion for payment UI

## Explicit non-goals for v1 rebuild

Do **not** treat these as required product features unless you consciously decide to build them:

| Item | Why |
|------|-----|
| User-to-user messaging (`messages` table) | Schema/export only; no send/receive UX in app |
| Assignment transaction audit trail writes | Table exported; never written by controllers |
| Stripe as primary gateway | Package present; **runtime path is MontyPay** |
| Broken `super_admin` OTP path as-is | Logic is inconsistent; redesign intentionally |
| Pixel-perfect Blade/JS UI | Rebuild UI; keep **behavior**, not markup chaos |

## Success criteria

The rebuild is successful when:

1. Same roles can perform the same actions with the same business outcomes.
2. Task and revision state machines match this pack (or documented intentional changes).
3. Payment net formula and invoice side-effects match.
4. File access rules by role match (including `allow_view`).
5. Acceptance scenarios in [10-acceptance-test-scenarios.md](./10-acceptance-test-scenarios.md) pass.

## Decisions to make before coding

- Keep MontyPay or replace gateway (keep payment **rules** either way).
- Keep Cloudflare R2 or swap S3-compatible storage.
- Keep encrypted integer IDs or switch to UUIDs / opaque public IDs.
- Fix dead features vs drop them (see [12-quirks-and-dead-features.md](./12-quirks-and-dead-features.md)).
- Whether admin `permissions` JSON is enforced in the new RBAC or only role strings.

## Out of scope (unless product expands later)

- Native mobile apps
- Real-time chat between client and tutor
- Automatic tutor matching by specialization (assignment is manual today)
- Multi-tenant white-label
- Marketplace discovery / public tutor profiles
