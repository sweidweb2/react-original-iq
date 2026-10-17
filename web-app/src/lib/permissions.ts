import type { AuthRole } from '@/services/auth'

/**
 * Frontend role checks are UX only — never a security boundary.
 */

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

/**
 * Super accounts are managed only by super; admins manage every role below super;
 * coordinators manage only tutors and clients.
 */
export function canManageRole(actorRole: AuthRole | null | undefined, role: AuthRole): boolean {
  if (actorRole === 'coordinator') return role === 'tutor' || role === 'client'
  return role !== 'super' || actorRole === 'super'
}

/** Roles the actor may assign when creating or editing a user. */
export function assignableRoles(actorRole: AuthRole | null | undefined) {
  return ROLE_OPTIONS.filter((option) => canManageRole(actorRole, option.value))
}
