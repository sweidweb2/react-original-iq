# 15 — Features by Page

Page → sections → modals → actions map. Use with [11](./11-screens-and-journeys.md), [17](./17-endpoint-action-catalog.md), [16](./16-feature-checklist-backlog.md).

Design HTML for public pages: [public_pages/](./public_pages/). Dashboard **UI** not exported — see [19](./19-dashboard-design-note.md).

---

## Public

### Home — `home` → `/`
**Blade:** `public/home.blade.php`  
**Sections:** hero, testimonials, how_it_works, cta, process, features + navbar/footer/chatbot/whatsapp  
**Modals:** lead-modal  
**Actions:** open lead → `create-lead-home`; register/login CTAs; language switch  

### Services — `services` → `/services`
**Sections:** hero, research_details, tutoring_details, assignment_help, specialized_program, why_choose, pricing-section  
**Actions:** navigate / CTA register  

### About — `about` → `/about`
**Sections:** hero, our_story, about_us, payment_methods, online_payment, why_join  
**Actions:** link to payment info; register CTAs  

### FAQ — `faq` → `/faq`
**Sections:** hero, categories, content  
**Actions:** expand FAQ; contact link  

### Contact — `contact` → `/contact`
**Sections:** hero, info-cards, contact-form, new-settler (newsletter), map  
**Actions:** `send-contact-message`; `create-stay-updated`  

### Terms / Privacy / Refunds — `terms`, `privacy-policy`, `refunds-policy`
**Actions:** read-only legal  

### Payment info — `payment` → `/payment`
**Sections:** hero, wish  
**Note:** nav link often commented; informational only  

### Pricing — blade exists, **route commented**
**Priority:** Skip / orphaned  

### Invoice preview — `invoice` → `/invoice`
**Blade:** `common_components/invoice/invoice.blade.php`  

---

## Auth

| Page | Routes | Blade | Actions |
|------|--------|-------|---------|
| Login | `login`, `unified.show.login` | `common/unified-login` | login + remember; forgot; register |
| Register | `unified.register`, `unified.show.register` | `common/unified-register` | register client + accept terms |
| OTP verify | `unified.verification`, `unified.verify.code`, `unified.resend.code` | `common/unified-verification` | verify 6-digit; resend |
| Forgot password | `password.request`, `password.email` | `common/forgot-password` | request code |
| Reset verify | `password.reset.verify` | `common/password-reset-verify` | verify; resend |
| Reset update | `password.reset.update` | `common/password-reset-update` | set new password |
| Logout | `unified.logout` | — | POST logout |

---

## Admin

### Dashboard — `admin-dashboard`
**Blade:** `admin/admin_dashboard.blade.php`  
**Sections:**
| Section | Purpose / actions |
|---------|-------------------|
| dashboard (KPI) | stats overview |
| tutors | list/filter; add tutor modal; manage profile; activate/deactivate |
| coordinators | same pattern + add coordinator |
| clients | same + add client |
| tasks | list/filter; create-task modal; open task details |
| permissions | change user role |
| payments | create/delete payment modals |
| refunds / refunds-required | create/delete refund; queue |
| feedback | list; delete |
| email | send custom email |
| analytics / reports / settings | **mostly UI stubs — not fully wired** |

**Modals:** add-tutor, add-client, add-coordinator, create-task, create-payment, delete-payment, create-refund, delete-refund  

**Also from dashboard nav:** view leads, stay-updated, contact messages  

### Profile — `admin-profile`
**Sections:** personal-information, admin-exports (Excel buttons)  
**Actions:** update profile/password; trigger exports  

### View leads — `admin.view-leads-table`
**Sections:** stats, search-filters, leads-table  
**Modals:** delete  
**Actions:** search; delete; export PDF/Excel  

### Stay updated — `admin.view-stay-updated`
**Sections:** stats, filters, emails-table  
**Actions:** delete; export  

### Contact messages — `admin.view-contact-message`
**Sections:** filters, messages-table  
**Modals:** view message, delete  
**Actions:** view; delete; export  

---

## Shared Admin + Coordinator

### Task details — `admin-coordinator-view-task-details`
**Sections:** page-header, status-banner, task-information, team-members, assign-tutor, change-coordinator (admin), files, solutions, sidebar, revision-section  
**Modals:** edit-task, edit-price, delete-modals, create-revision  
**Actions:**
- Edit task / price  
- Assign / remove tutor  
- Change coordinator (admin)  
- Upload/download/delete docs & solutions  
- Approve / disapprove / cancel / activate / delete task  
- Toggle `allow_view` (admin)  
- Create / cancel / approve / reject revision  
- Open payments / revision details  

### Task payments — `admin-coordinator-view-task-payments`
**Sections:** insights, refund-form, refunds-table, payments-table  
**Actions:** view money; submit refund → `admin-coordinator-pay-refund-for-task`  

### Revision details — `admin-coordinator-view-revision-details`
**Sections:** task-info, session-info, solutions-table  
**Modals:** edit-revision  
**Actions:** edit session; download revision solutions  

### Manage user profile — `admin-coordinator-manage-user-profile`
**Sections:** role-specific forms, danger-zone, related tasks  
**Modals:** delete user / delete task confirm  
**Actions:** update user; delete user; open/delete tasks  

---

## Coordinator

### Dashboard — `coordinator-dashboard`
**Sections:** dashboard, requests, kanban (+ create-task), tutors, clients, reports, leaderboard  
**Modals:** create-task; assign-task (**hardcoded stub — skip**); review-task; evaluate-tutor  
**Actions:** view requests/kanban; create task; open task details; manage profiles; evaluate tutor  

### Profile — `coordinator-profile`
**Actions:** update personal info / password  

---

## Tutor

### Dashboard — `tutor-dashboard`
**Sections:** dashboard, tasks, performance, feedback  
**Modals:** submit-task (entry to details flow)  
**Actions:** open assigned tasks; view stats/feedback  

### Profile — `tutor-profile`
**Actions:** update personal info / password  

### Task details — `tutor-view-task-details`
**Sections:** status-banner, task-information, timeline, coordinator-information, documents, solutions, sidebar  
**Modals:** delete-solution confirm  
**Actions:**
- Download docs  
- Upload / download / delete solutions  
- Submit / cancel task delivery  
- Submit / cancel revision submission  

---

## Client

### Dashboard — `client-dashboard` (+ `client-billing` → same with billing section)
**Sections:** dashboard, services (**request form**), requests list, feedback, billing  
**Modals:** upload-loading  
**Actions:**
- Submit task request + files (`send-task-request`)  
- Open task details  
- Submit feedback  
- Open billing / payments  

### Profile — `client-profile`
**Actions:** update personal info / password; delete account (route exists, UI sparse)  

### Task details — `view-task-details`
**Sections:** status-banner, task-information, timeline, team-members, files, solutions, sidebar  
**Modals:** edit-task, delete-task confirm, file-delete confirm  
**Actions:** edit/delete task; upload/download/delete docs; download solutions (if allowed); open payments  

### Task payments — `client-view-task-payments`
**Sections:** refund-info, payment-completed, payment-form, payments-table  
**Actions:** pay remaining → `client-pay-for-task`; view history / invoices  

---

## Cross-page widgets

| Widget | Where | Action |
|--------|-------|--------|
| Chatbot | public + many layouts | `POST /chatbot/message` |
| WhatsApp icon | public | external link |
| Language switcher | public nav | `language.switch` |
| Toast / loaders | most apps | UX only |

---

## Rebuild tip

1. Rebuild **actions + rules** from this map + Docs 02–08.  
2. Rebuild **public look** from `public_pages/`.  
3. Redesign dashboards cleanly — do not copy Blade chaos; keep section/action inventory above.
