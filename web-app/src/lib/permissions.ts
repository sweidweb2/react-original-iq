import type { AuthRole, AuthUser } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

/**
 * Frontend role and permission checks are UX only — never a security boundary.
 * Keys mirror `backend/src/authz/permission-catalog.ts`.
 */

export type PermissionKey =
  | 'view_users'
  | 'create_users'
  | 'manage_users'
  | 'reset_user_passwords'
  | 'manage_super_users'
  | 'manage_admins'
  | 'manage_coordinators'
  | 'manage_tutors'
  | 'manage_clients'
  | 'change_user_roles'
  | 'activate_users'
  | 'delete_users'
  | 'assign_user_permissions'
  | 'manage_specializations'
  | 'view_activity_logs'
  | 'view_error_logs'
  | 'manage_rbac'
  | 'manage_backups'
  | 'manage_system'
  | 'view_dashboard'
  | 'view_reports'
  | 'export_data'
  | 'send_custom_emails'
  | 'manage_leads'
  | 'manage_contact_messages'
  | 'manage_newsletter'
  | 'view_tasks'
  | 'view_all_tasks'
  | 'create_own_tasks'
  | 'create_tasks'
  | 'edit_own_tasks'
  | 'edit_tasks'
  | 'delete_own_tasks'
  | 'delete_tasks'
  | 'assign_tutors'
  | 'change_coordinator'
  | 'set_pricing'
  | 'cancel_tasks'
  | 'toggle_allow_view'
  | 'approve_deliveries'
  | 'submit_work'
  | 'download_task_documents'
  | 'upload_task_documents'
  | 'delete_task_documents'
  | 'download_solutions'
  | 'upload_solutions'
  | 'delete_solutions'
  | 'bulk_download_files'
  | 'view_revisions'
  | 'create_revisions'
  | 'manage_revisions'
  | 'submit_revisions'
  | 'view_payment_summary'
  | 'view_payments'
  | 'pay_own_tasks'
  | 'manage_payments'
  | 'manage_refunds'
  | 'download_invoices'
  | 'manage_invoices'
  | 'view_feedback'
  | 'submit_feedback'
  | 'delete_feedback'
  | 'evaluate_tutors'
  | 'manage_own_profile'
  | 'delete_own_account'

/** One key, or a list where any one key is enough. */
export type PermissionCheck = PermissionKey | readonly PermissionKey[]

export function hasRole(
  role: AuthRole | null | undefined,
  allowed: AuthRole | AuthRole[],
): boolean {
  if (!role) return false
  const list = Array.isArray(allowed) ? allowed : [allowed]
  return list.includes(role)
}

export function hasAnyRole(role: AuthRole | null | undefined, allowed: AuthRole[]): boolean {
  return hasRole(role, allowed)
}

export function hasPermission(
  user: Pick<AuthUser, 'permissions'> | null | undefined,
  check: PermissionCheck,
): boolean {
  const granted = user?.permissions
  if (!granted) return false
  const keys: readonly PermissionKey[] = typeof check === 'string' ? [check] : check
  return keys.some((key) => granted.includes(key))
}

/** `can(key)` for the signed-in user; re-renders when their permissions change. */
export function useCan(): (check: PermissionCheck) => boolean {
  const permissions = useAuthStore((s) => s.user?.permissions)
  return (check) => hasPermission({ permissions }, check)
}

export const STAFF_ROLES: AuthRole[] = ['super', 'admin', 'coordinator', 'tutor']

export const SUPER_ROLES: AuthRole[] = ['super']

export const ADMIN_ROLES: AuthRole[] = ['admin']

export const ROLE_OPTIONS: { value: AuthRole; label: string }[] = [
  { value: 'super', label: 'Super' },
  { value: 'admin', label: 'Admin' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'client', label: 'Client' },
]

const ROLE_MANAGE_PERMISSION: Record<AuthRole, PermissionKey> = {
  super: 'manage_super_users',
  admin: 'manage_admins',
  coordinator: 'manage_coordinators',
  tutor: 'manage_tutors',
  client: 'manage_clients',
}

/** Managing an account of `role` needs that role's manage permission (e.g. `manage_tutors`). */
export function canManageRole(
  user: Pick<AuthUser, 'permissions'> | null | undefined,
  role: AuthRole,
): boolean {
  return hasPermission(user, ROLE_MANAGE_PERMISSION[role])
}

/** Roles the actor may assign when creating or editing a user. */
export function assignableRoles(user: Pick<AuthUser, 'permissions'> | null | undefined) {
  return ROLE_OPTIONS.filter((option) => canManageRole(user, option.value))
}
