import { type ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { InlineSpinner } from '@/components/feedback/async-state'
import { useAuthStore } from '@/stores/authStore'

type RequireAuthProps = {
  children: ReactNode
}

/**
 * Redirects anonymous users to login. Wait for persist hydration first.
 * Re-reads `/auth/me` once per signed-in user so permissions edited in RBAC show up.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const userId = user?.id
  const [refreshedFor, setRefreshedFor] = useState<string | null>(null)
  const waitingForPermissions = Boolean(user && !user.permissions && refreshedFor !== userId)

  useEffect(() => {
    if (!isHydrated || !userId) return
    refreshProfile()
      .catch(() => undefined)
      .finally(() => setRefreshedFor(userId))
  }, [isHydrated, userId, refreshProfile])

  if (!isHydrated || waitingForPermissions) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <InlineSpinner label="Loading session…" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
