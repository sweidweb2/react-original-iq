import { ADMIN_ROLES, hasAnyRole, hasRole, STAFF_ROLES } from '@/lib/permissions'
import type { AuthRole } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role ?? null)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = Boolean(user)

  return {
    role,
    isAuthenticated,
    can: (allowed: AuthRole | AuthRole[]) => hasRole(role, allowed),
    canAny: (allowed: AuthRole[]) => hasAnyRole(role, allowed),
    isStaff: hasAnyRole(role, STAFF_ROLES),
    isAdmin: hasAnyRole(role, ADMIN_ROLES),
  }
}
