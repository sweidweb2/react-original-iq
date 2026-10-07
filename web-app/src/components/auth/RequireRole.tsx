import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { hasAnyRole } from '@/lib/permissions'
import type { AuthRole } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

type RequireRoleProps = {
  roles: AuthRole[]
  children: ReactNode
  /** Where to send unauthorized users. Default home. */
  fallbackTo?: string
  fallback?: ReactNode
}

/**
 * Route-level UX gate by role. Backend must still authorize the API.
 */
export function RequireRole({ roles, children, fallbackTo = '/', fallback }: RequireRoleProps) {
  const role = useAuthStore((s) => s.user?.role)

  if (!hasAnyRole(role, roles)) {
    return fallback ?? <Navigate to={fallbackTo} replace />
  }

  return children
}
