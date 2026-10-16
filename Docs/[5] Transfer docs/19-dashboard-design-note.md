# 19 — Dashboard Design Note (Skipped)

Dashboard **UI/HTML/CSS export was intentionally skipped** (per request — no zip of logged-in Blade trees).

## What this means

| Layer | Status |
|-------|--------|
| Dashboard **business actions** | Documented in [15](./15-features-by-page.md) |
| Dashboard **endpoints** | Documented in [17](./17-endpoint-action-catalog.md) |
| Dashboard **look & markup** | **Not** copied into Docs — redesign in the new stack |
| Public marketing design | Exported in [public_pages/](./public_pages/) |

## If you still need visual reference before trash

Open these blades in the old project (do not require Docs copies):

| Role | Entry blades |
|------|----------------|
| Admin | `resources/views/admin/admin_dashboard.blade.php`, `admin_profile.blade.php`, `view_leads_table.blade.php`, `view_stay_updated.blade.php`, `view_contact_messages.blade.php` |
| Coordinator | `resources/views/coordinator/cor_dashboard.blade.php`, `cor_profile.blade.php` |
| Tutor | `resources/views/tutor/tutor_dashboard.blade.php`, `tutor_profile.blade.php`, `tutor_view_task_details.blade.php` |
| Client | `resources/views/client/client_dashboard.blade.php`, `client_profile.blade.php`, `client_view_task_details.blade.php`, `client_view_task_payment.blade.php` |
| Shared ops | `resources/views/common_admin_coor/admin_cor_view_task_details.blade.php`, `…_payments.blade.php`, `…_revision_details.blade.php`, `manage_user_profile.blade.php` |

CSS lives under `public/css/{admin,coordinator,tutor,client,common_admin_coor}/`.

## Rebuild guidance

1. Keep **section + action inventory** from Doc 15.  
2. Use `_shared/theme.css` tokens from public_pages for brand colors.  
3. Build clean dashboards (tables, filters, modals) — do not port the old structure 1:1.  
4. Wire every Must feature from [16](./16-feature-checklist-backlog.md).

## Explicit non-goal

No `Docs/dashboard_pages/` HTML pack will be generated unless you ask later (and still have the old repo).
