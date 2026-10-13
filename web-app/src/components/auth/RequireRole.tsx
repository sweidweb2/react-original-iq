import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { ForbiddenPage } from '@/features/errors/ForbiddenPage'
import { hasAnyRole } from '@/lib/permissions'
import type { AuthRole } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

type RequireRoleProps = {
  roles: AuthRole[]
  children: ReactNode
  /** Optional redirect. When omitted, the access-denied page is shown. */
  fallbackTo?: string
  fallback?: ReactNode
}

/**
 * Route-level UX gate by role. Backend must still authorize the API.
 */
export function RequireRole({ roles, children, fallbackTo, fallback }: RequireRoleProps) {
  const role = useAuthStore((s) => s.user?.role)

  if (!hasAnyRole(role, roles)) {
    if (fallback) return fallback
    if (fallbackTo) return <Navigate to={fallbackTo} replace />
    return <ForbiddenPage />
  }

  return children
}
