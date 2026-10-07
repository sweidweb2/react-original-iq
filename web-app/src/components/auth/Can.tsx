import type { ReactNode } from 'react'

import { hasRole } from '@/lib/permissions'
import type { AuthRole } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

type CanProps = {
  roles: AuthRole | AuthRole[]
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Conditionally render UI by role (hide buttons, nav items, etc.).
 * UX only — never rely on this for security.
 */
export function Can({ roles, children, fallback = null }: CanProps) {
  const role = useAuthStore((s) => s.user?.role)

  if (!hasRole(role, roles)) {
    return fallback
  }

  return children
}
