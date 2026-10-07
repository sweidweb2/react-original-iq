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

export const STAFF_ROLES: AuthRole[] = ['admin', 'coordinator', 'tutor']

export const ADMIN_ROLES: AuthRole[] = ['admin']
