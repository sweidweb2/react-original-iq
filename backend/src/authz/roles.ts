import type { RoleName } from '../modules/auth/auth.schema.js'

/** Platform super — activity / audit oversight. */
export const SUPER_ROLES: readonly RoleName[] = ['super'] as const

/** Elevated admins (ops). */
export const ADMIN_ROLES: readonly RoleName[] = ['admin'] as const

/** Staff roles (UI + coarse route gates). Not a permission matrix. */
export const STAFF_ROLES: readonly RoleName[] = ['super', 'admin', 'coordinator', 'tutor'] as const

export function hasAnyRole(
  roles: readonly string[] | undefined,
  allowed: readonly RoleName[],
): boolean {
  if (!roles?.length || allowed.length === 0) return false
  return allowed.some((role) => roles.includes(role))
}

export function isSuper(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, SUPER_ROLES)
}

export function isAdmin(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, ADMIN_ROLES)
}

export function isStaff(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, STAFF_ROLES)
}
