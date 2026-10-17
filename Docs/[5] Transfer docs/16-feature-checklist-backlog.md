# 16 — Feature Checklist Backlog (Must / Should / Skip)

Flat rebuild backlog. Tie each item to routes where known. See [17](./17-endpoint-action-catalog.md) for full endpoints.

**Legend:** Must = v1 required · Should = v1 nice · Skip = do not rebuild (or later)

---

## Must

| ID  | Feature                                                                           | Key routes / notes                                                                         | Spec             |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------- |
| M01 | Public marketing pages (home, services, about, faq, contact, legal)               | `home`, `services`, `about`, `faq`, `contact`, `terms`, `privacy-policy`, `refunds-policy` | 15, public_pages |
| M02 | Login / register (client) / logout                                                | `login`, `unified.*`                                                                       | 07               |
| M03 | Password reset flow                                                               | `password.*`                                                                               | 07               |
| M04 | Role-based dashboards (real task lists)                                           | `*-dashboard`                                                                              | 15               |
| M05 | Client create task + files                                                        | `send-task-request`, upload docs                                                           | 04, 08           |
| M06 | Auto-assign least-loaded coordinator                                              | on create                                                                                  | 04               |
| M07 | Task lifecycle (assign/remove tutor, submit, approve/disapprove, cancel/activate) | admin-coordinator-* , tutor-submit-*                                                       | 04               |
| M08 | Task details per role                                                             | client/tutor/admin-coor view details                                                       | 15               |
| M09 | Documents + solutions (upload/download/delete/zip)                                | `common-*`, StorageController                                                              | 08               |
| M10 | Set/edit task price + payment_status recompute                                    | `admin-coordinator-edit-price`                                                             | 06               |
| M11 | MontyPay client checkout + webhook                                                | `client-pay-for-task`, `montypay.callback`                                                 | PAYMENT          |
| M12 | Admin manual payment create/delete                                                | `admin.create-payment`, `admin.delete-payment`                                             | 06               |
| M13 | Refunds (admin/coord) + refund-required handling                                  | `admin.create-refund`, `admin-coordinator-pay-refund-for-task`                             | 06               |
| M14 | Revision sessions full loop                                                       | create/submit/approve/reject/cancel                                                        | 05               |
| M15 | Profile update (name/email/phone/password) all roles                              | `*.update-profile-*`                                                                       | 07               |
| M16 | Admin user CRUD (add/activate/deactivate/delete)                                  | `admin.store-*`, activate/deactivate/delete                                                | 02               |
| M17 | Invoice generate + download                                                       | on payment; `admin.download-invoice`                                                       | 06               |
| M18 | Auth guards + inactive user block + rate limit                                    | middleware                                                                                 | 07               |

---

## Should

| ID  | Feature                                                                   | Key routes                                           | Spec   |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------- | ------ |
| S01 | Lead capture + admin leads table                                          | `create-lead*`, `admin.view-leads-table`             | 15     |
| S02 | Contact form + admin inbox                                                | `send-contact-message`, `admin.view-contact-message` | 15     |
| S03 | Stay-updated newsletter list                                              | `create-stay-updated`, `admin.view-stay-updated`     | 15     |
| S04 | Client feedback submit + admin view/delete                                | `client.submit-feedback`, `admin.delete-feedback`    | —      |
| S05 | Tutor evaluation metrics                                                  | `common-evaluate-tutor`                              | 02     |
| S06 | Core Excel/CSV exports (users, tasks, payments, refunds, leads, feedback) | `admin.export-*-excel`                               | 13     |
| S07 | Leads / stay-updated PDF export                                           | `admin.export-*-pdf`                                 | 13     |
| S08 | Admin OTP / 2FA (redesign)                                                | `unified.verification`                               | 07, 12 |
| S09 | Client `allow_view` toggle                                                | `admin.change-access-to-task`                        | 08     |
| S10 | i18n EN/AR + RTL                                                          | `language.switch` + `carry/lang`                     | carry  |
| S11 | Currency converter for pay UI                                             | `GET /convert`                                       | 09     |
| S12 | Change user role / permissions UI                                         | `admin.change-user-permissions`                      | 02     |
| S13 | Reassign coordinator on task                                              | `admin.change-coordinator-of-task`                   | 04     |
| S14 | Admin search/filter tutors/clients/tasks                                  | `admin.filter-*`, `admin.search-users`               | —      |
| S15 | Custom admin email                                                        | `admin.send-custom-email`                            | 09     |
| S16 | Tutor specializations on user edit                                        | admin update user                                    | 03     |
| S17 | Coordinator safe-delete user                                              | `coordinator.delete-user`                            | 02     |

---

## Skip (v1) / later

| ID  | Feature                                        | Why                               |
| --- | ---------------------------------------------- | --------------------------------- |
| X01 | In-app Messages UX                             | Table/export only; no product UX  |
| X02 | `assignment_transactions` writes               | Never written; export only        |
| X03 | Public `/pricing` page                         | Route commented; orphaned         |
| X04 | Public `/payment` info in nav                  | Redundant; optional later         |
| X05 | Public standalone `/invoice`                   | Only if email links need it       |
| X06 | Admin Reports section buttons                  | UI stub, not wired                |
| X07 | Admin Settings commission forms                | Non-persisted UI                  |
| X08 | Coordinator assign-task modal (hardcoded)      | Dead; real assign on task details |
| X09 | Chatbot                                        | Soft; defer (Gemini optional)     |
| X10 | Exports for messages / assignment_transactions | Dead data                         |
| X11 | Public `/clear-cache`                          | Security hazard                   |
| X12 | Duplicate contact/stay-updated endpoints       | Consolidate to one each           |
| X13 | Client delete-account (sparse UI)              | Defer destructive account wipe    |
| X14 | Separate `approveUser` if activate covers it   | Simplify                          |
| X15 | Stripe                                         | Not the live path; MontyPay is    |

---

## Suggested v1 cut line

Ship **all Must**. Add **S01–S11** if time. Everything in **Skip** stays out unless product insists.

## Tracking

Copy into your issue tracker as epics:

1. Auth + users (M02–M03, M15–M16, M18)
2. Tasks + files + revisions (M05–M09, M14)
3. Money (M10–M13, M17)
4. Public + CRM (M01, S01–S03)
5. Ops polish (S05–S17)
