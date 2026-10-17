# Original IQ — Rebuild Documentation Pack

Portable, stack-agnostic specs extracted from the current Laravel app. Use these to rebuild with the **same business logic and domain model** on a new tech stack.

## How to use

1. Read docs in order (or use the Minimum pack below).
2. Treat these as the source of truth for product behavior — not the old Blade/JS code.
3. When old code conflicts with a doc, prefer the doc after you decide whether the quirk is intentional (see [12-quirks-and-dead-features.md](./12-quirks-and-dead-features.md)).

## Start here (carry into the new project)

| File / folder                                        | Purpose                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md) | Phase-by-phase rebuild plan                                      |
| [ENV_VARIABLES.md](./ENV_VARIABLES.md)               | **Filled** env secrets from old `.env`                           |
| [PAYMENT.md](./PAYMENT.md)                           | Payments / MontyPay / invoices guide                             |
| [15–19](./15-features-by-page.md)                    | Features-by-page, backlog, endpoints, validation, dashboard note |
| [public_pages/](./public_pages/)                     | Marketing pages HTML/CSS/JS export                               |
| [carry/](./carry/)                                   | Lang EN/AR, emails, invoice PDF blade, web_doc, JSON data        |

## Full pack

| #   | Document                                                                   | Purpose                         |
| --- | -------------------------------------------------------------------------- | ------------------------------- |
| 01  | [Product Scope & Non-Goals](./01-product-scope-and-non-goals.md)           | What the product is / isn’t     |
| 02  | [Roles & Permissions Matrix](./02-roles-and-permissions.md)                | Who can do what                 |
| 03  | [Domain Model & Data Dictionary](./03-domain-model-and-data-dictionary.md) | Entities, fields, relationships |
| 04  | [Task Lifecycle Spec](./04-task-lifecycle.md)                              | Main workflow state machine     |
| 05  | [Revision Lifecycle Spec](./05-revision-lifecycle.md)                      | Revision session state machine  |
| 06  | [Payments, Refunds & Invoices](./06-payments-refunds-invoices.md)          | Money rules                     |
| 07  | [Auth, OTP & Session Policy](./07-auth-otp-session.md)                     | Login, OTP, rate limits         |
| 08  | [File Storage & Access Control](./08-file-storage-and-access.md)           | Docs, solutions, R2 rules       |
| 09  | [Integrations Spec](./09-integrations.md)                                  | MontyPay, R2, mail, Gemini, FX  |
| 10  | [Acceptance Test Scenarios](./10-acceptance-test-scenarios.md)             | Parity checklist                |
| 11  | [Screens & User Journeys](./11-screens-and-journeys.md)                    | UI rebuild map                  |
| 12  | [Quirks & Dead Features](./12-quirks-and-dead-features.md)                 | What not to copy blindly        |
| 13  | [Admin Exports Catalog](./13-admin-exports-catalog.md)                     | Excel/PDF exports               |
| 14  | [Environment & Secrets Checklist](./14-environment-and-secrets.md)         | Config keys to provision        |
| 15  | [Features by Page](./15-features-by-page.md)                               | Page → sections → actions       |
| 16  | [Feature Checklist Backlog](./16-feature-checklist-backlog.md)             | Must / Should / Skip            |
| 17  | [Endpoint / Action Catalog](./17-endpoint-action-catalog.md)               | Full routes list                |
| 18  | [Form Validation Catalog](./18-form-validation-catalog.md)                 | Field rules per form            |
| 19  | [Dashboard Design Note](./19-dashboard-design-note.md)                     | UI export skipped — blade map   |

## Minimum pack (5 files)

If you want fewer files while rebuilding solo:

1. **01 + 02 + 11** → product, roles, journeys
2. **03** → data model
3. **04 + 05 + 06 + 08** → workflows + money + files
4. **07 + 09 + 14** → auth + integrations + env
5. **10 + 12** → parity tests + quirks

## Product snapshot

**Original IQ** is a multi-role tutoring / academic-support marketplace:

- **Clients** submit tasks with documents and pay.
- **Coordinators** assign tutors, manage price/status, approve deliveries and revisions.
- **Tutors** download docs, upload solutions, submit work and revisions.
- **Admins** oversee users, payments, refunds, exports, leads, and system access.
- Public site captures leads, contact messages, newsletter signups; EN/AR with RTL.

## Design export (marketing UI)

Static HTML/CSS/JS packages for public pages live in **[public_pages/](./public_pages/)** — theme + each marketing page folder with resolved markup and assets.

## Source anchors (old codebase)

- Models: `app/Models/`
- Migrations: `database/migrations/`
- Controllers: `app/Http/Controllers/` (especially `CommonController`, `ClientController`, `TutorController`, `AdminController`, `MontyPayController`)
- Payments: `app/Services/MontyPayService.php`
- Routes: `routes/web.php`
- Narrative: `README.md`, `public/doc/web_doc.txt`
