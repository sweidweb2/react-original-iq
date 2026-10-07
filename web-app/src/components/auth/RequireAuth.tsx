import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { InlineSpinner } from '@/components/feedback/async-state'
import { useAuthStore } from '@/stores/authStore'

type RequireAuthProps = {
  children: ReactNode
}

/** Redirects anonymous users to login. Wait for persist hydration first. */
export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) {
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
