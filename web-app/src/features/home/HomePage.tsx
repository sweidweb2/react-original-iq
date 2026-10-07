import { GraduationCap } from 'lucide-react'
import { Navigate } from 'react-router-dom'

import { homePathForRole } from '@/lib/homePath'
import { useAuthStore } from '@/stores/authStore'

/** Kept for compatibility — authenticated users are redirected to their portal. */
export function HomePage() {
  const role = useAuthStore((s) => s.user?.role)
  if (role) {
    return <Navigate to={homePathForRole(role)} replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
      <GraduationCap className="size-10 text-foreground" aria-hidden />
      <p className="text-muted-foreground">Sign in to open your portal.</p>
    </div>
  )
}
