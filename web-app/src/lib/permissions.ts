import type { AuthRole } from '@/services/auth'

/**
 * Frontend role checks are UX only — never a security boundary.
 * Backend uses role gates + ownership (not permission-matrix RBAC).
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

/** Staff roles (exact product matrix may grow later). */
export const STAFF_ROLES: AuthRole[] = ['SUPER', 'ADMIN', 'TUTOR']

export const ADMIN_ROLES: AuthRole[] = ['SUPER', 'ADMIN']
