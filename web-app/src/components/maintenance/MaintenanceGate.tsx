import { type ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { PORTALS } from '@/features/portals/portalNav'
import { homePathForRole } from '@/lib/homePath'
import { useAuthStore } from '@/stores/authStore'
import { useMaintenanceStore } from '@/stores/maintenanceStore'

export const MAINTENANCE_PATH = '/maintenance'

const POLL_INTERVAL_MS = 60_000

const BLOCKED_PREFIXES = [
  ...PORTALS.map((portal) => portal.path),
  '/forgot-password',
  '/password-reset',
]

function isBlockedPath(pathname: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Sends everyone but SUPER to the maintenance page while maintenance is on.
 * Public pages, login and signup stay reachable; the backend rejects their operations.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const maintenanceMode = useMaintenanceStore((s) => s.maintenanceMode)
  const isKnown = useMaintenanceStore((s) => s.isKnown)
  const check = useMaintenanceStore((s) => s.check)

  const onMaintenancePage = pathname === MAINTENANCE_PATH
  const shouldPoll = Boolean(user) || onMaintenancePage || maintenanceMode

  useEffect(() => {
    void check()
  }, [pathname, check])

  useEffect(() => {
    if (!shouldPoll) return
    const onFocus = () => void check({ force: true })
    const timer = window.setInterval(() => void check({ force: true }), POLL_INTERVAL_MS)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [shouldPoll, check])

  const isSuper = user?.role === 'super'

  if (maintenanceMode && !isSuper && isBlockedPath(pathname)) {
    return <Navigate to={MAINTENANCE_PATH} replace />
  }

  if (onMaintenancePage && isKnown && (!maintenanceMode || isSuper)) {
    return <Navigate to={user ? homePathForRole(user.role) : '/'} replace />
  }

  return children
}
