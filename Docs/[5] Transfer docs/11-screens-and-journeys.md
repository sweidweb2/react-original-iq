# 11 — Screens & User Journeys

Rebuild UI freely; preserve journeys and outcomes.

## Public site

| Screen                           | Purpose                               |
| -------------------------------- | ------------------------------------- |
| Home                             | Brand, CTA, lead modal                |
| Services                         | Tutoring / research / pricing content |
| About                            | Company + payment methods info        |
| FAQ                              | Support content                       |
| Contact                          | Contact form → ContactMessage         |
| Terms / Privacy / Refunds policy | Legal                                 |
| Language switch                  | `en` / `ar`                           |

Public widgets: lead capture, stay-updated, chatbot.

---

## Auth screens

- Login
- Register (client)
- OTP verification
- Forgot password / verify code / update password
- Logout

---

## Client journeys

### J1 — Request help

1. Register / login
2. Dashboard → create task (topic, type, category, desc, deadline, files)
3. See task as `pending`
4. Wait for coordinator pricing / tutor assignment

### J2 — Pay & receive

1. Open task details / payments
2. Pay remaining via gateway
3. After `allow_view` (and/or policy), download solutions
4. Submit feedback / ratings

### J3 — Manage account

1. Profile edit
2. Optional account delete (rules permitting)

**Client screens:** dashboard, task details, payments, profile, feedback UI.

---

## Tutor journeys

### J4 — Deliver work

1. Login → dashboard (assigned tasks)
2. Open task → download docs
3. Upload solutions
4. Submit task → wait for approval
5. Optional cancel submit before approval

### J5 — Handle revision

1. Open revision session
2. Upload revision solutions
3. Submit revision / cancel submit
4. Rework if rejected

**Tutor screens:** dashboard, task details, profile, revision section.

---

## Coordinator journeys

### J6 — Intake & assign

1. Dashboard on assigned/ops tasks
2. Create or open task
3. Set price
4. Assign tutor
5. Monitor status

### J7 — Quality gate

1. Review submitted work / files
2. Approve or disapprove
3. Create revision if needed → approve/reject/cancel
4. Cancel / reactivate tasks
5. Limited user profile management / safe delete

**Coordinator screens:** dashboard (stats, leaderboard sections), task details, revision modal, price modal, profile mgmt.

---

## Admin journeys

### J8 — Operate platform

1. Global dashboard
2. Create/activate/deactivate users; set roles/permissions
3. All coordinator task powers + reassign coordinator
4. Toggle `allow_view`
5. Manual payments / refunds
6. Leads / contact / stay-updated cleanup
7. Exports (CSV/PDF)
8. Custom emails

**Admin screens:** dashboard, user management, task details, payments/refunds modals, leads, contact messages, stay-updated, profile, export actions.

---

## Shared UI building blocks (functional, not visual)

- Toast notifications
- Upload / download loaders
- Revision section + create revision modal
- Edit price modal
- Create/delete payment modals
- Create/delete refund modals
- Lead modal (public)
- Chatbot widget

Cards/modals are interaction containers — redesign visuals freely.

---

## Navigation map (logical)

```
Public ── Auth ── Role home
                 ├─ Client: tasks → task detail → pay/feedback
                 ├─ Tutor: assigned tasks → deliver/revise
                 ├─ Coordinator: ops tasks → assign/approve/revise
                 └─ Admin: everything + users + money + exports + CRM intake
```

## What not to preserve

- Exact Blade structure / jQuery-ish chatbot wiring
- Duplicated JS per role folder chaos
- Inconsistent 10MB vs 500MB messaging in UI copy — unify
