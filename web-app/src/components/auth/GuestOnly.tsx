import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { InlineSpinner } from '@/components/feedback/async-state'
import { homePathForRole } from '@/lib/homePath'
import { useAuthStore } from '@/stores/authStore'

type GuestOnlyProps = {
  children: ReactNode
  redirectTo?: string
}

/** Auth screens — send signed-in users to role home (or redirectTo). */
export function GuestOnly({ children, redirectTo }: GuestOnlyProps) {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <InlineSpinner label="Loading session…" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={redirectTo ?? homePathForRole(user.role)} replace />
  }

  return children
}
