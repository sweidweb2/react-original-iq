# 02 — Roles & Permissions Matrix

## Role storage

- Single `users` table.
- Runtime authority key: **`users.role`** string.
- Values in use: `admin` | `coordinator` | `tutor` | `client`.
- Migration also has `user_type` — **unused at runtime**; do not reintroduce both without reason.
- Public registration always creates `role = client`.
- Admins can create users with roles: `admin`, `coordinator`, `tutor`, `client`.

## Route / access pattern (current)

Middleware checks authenticated user and `role ∈ allowed list`. Combined groups exist (e.g. admin+coordinator for shared task ops).

Recommended rebuild: explicit permission checks or policy objects; do not scatter role strings in every handler.

## Capability matrix

Legend: **Y** = yes · **L** = limited · **—** = no

### Users & accounts

| Action | Client | Tutor | Coordinator | Admin |
|--------|--------|-------|-------------|-------|
| Self-register | Y | — | — | — |
| Login / logout / password reset | Y | Y | Y | Y |
| Manage own profile | Y | Y | Y | Y |
| Delete own account | Y | L | L | L |
| Create users (any role) | — | — | — | Y |
| Activate / deactivate users | — | — | — | Y |
| Change user role / permissions | — | — | — | Y |
| Safe-delete users without active tasks | — | — | L | Y |
| View / manage leads, contact, newsletter | — | — | — | Y |

### Tasks

| Action | Client | Tutor | Coordinator | Admin |
|--------|--------|-------|-------------|-------|
| Create own task request | Y | — | — | — |
| Create task (ops) | — | — | Y | Y |
| View own / assigned tasks | Y (own) | Y (assigned) | Y (assigned/ops) | Y (all) |
| Edit unpaid / allowed fields | Y (own) | — | Y | Y |
| Delete task (if no payments/refunds) | Y (own) | — | L | Y |
| Assign / remove tutor | — | — | Y | Y |
| Set / edit price | — | — | Y | Y |
| Cancel / activate task | — | — | Y | Y |
| Submit delivery | — | Y | — | — |
| Cancel own submission | — | Y | — | — |
| Approve / disapprove delivery | — | — | Y | Y |
| Toggle `allow_view` (client sees solutions) | — | — | — | Y |
| Reassign coordinator | — | — | — | Y |

### Revisions

| Action | Client | Tutor | Coordinator | Admin |
|--------|--------|-------|-------------|-------|
| Create revision session | — | — | Y | Y |
| Upload revision solutions | — | Y | — | — |
| Submit / cancel revision submission | — | Y | — | — |
| Approve / reject / cancel session | — | — | Y | Y |

### Payments & money

| Action | Client | Tutor | Coordinator | Admin |
|--------|--------|-------|-------------|-------|
| Pay remaining balance (gateway) | Y (own) | — | — | — |
| View payment history on own tasks | Y | snapshot | Y | Y |
| Manual create/delete payment | — | — | — | Y |
| Create refund | — | — | L | Y |
| Download invoice | Y (own) | — | — | Y |

### Files

| Action | Client | Tutor | Coordinator | Admin |
|--------|--------|-------|-------------|-------|
| Upload task documents | Y (own, rules) | — | Y | Y |
| Download task documents | Y | Y (assigned) | Y | Y |
| Upload solutions | — | Y | Y | Y |
| Download solutions | Y if `allow_view` / rules | Y | Y | Y |
| Delete files (role-gated) | L | L | Y | Y |
| Bulk download | L | L | Y | Y |

### Feedback & scoring

| Action | Client | Tutor | Coordinator | Admin |
|--------|--------|-------|-------------|-------|
| Submit feedback on completed work | Y | — | — | — |
| View feedback | Y | Y | Y | Y |
| Evaluate tutor metrics (punctuality/quality/perfection/stars) | shared ops | — | Y | Y |

### Reporting

| Action | Client | Tutor | Coordinator | Admin |
|--------|--------|-------|-------------|-------|
| Dashboard stats | own | own | assigned | global |
| CSV / PDF exports | — | — | — | Y |
| Custom admin emails | — | — | — | Y |

## Admin permission keys (JSON)

Stored on `users.permissions` (array). Intended keys:

- `manage_users`
- `manage_tutors`
- `manage_coordinators`
- `view_reports`
- `manage_system`

**Current reality:** route access is mostly **role-string** gated; these helpers exist on `User` but are lightly enforced. In the rebuild, either:

1. Enforce them properly, or  
2. Drop them and use role-only RBAC until needed.

## `isSuperAdmin` note

Current code treats super admin as `role === 'admin' AND role === 'super_admin'` (unreachable). OTP-for-admin was intended to hang off this. **Redesign** admin 2FA as a real flag or separate role — do not copy the bug.

## Important business guards (cross-cutting)

- Inactive users (`is_active = false`) cannot log in.
- Client cannot delete a task that has any payments or refunds.
- Cannot assign a second tutor while one is set (remove first).
- Only one open revision session per task (`in-revision` or `waiting_coordinator_approval`).
- Completing / changing task status is blocked while an active revision exists (except completing when allowed by rules — see task lifecycle doc).
- Client payment blocked when net already ≥ price.
- Refunds capped by overpay / net rules.
