import { Home } from 'lucide-react'

import type { PortalNavItem } from './PortalShell'

export const ADMIN_NAV: PortalNavItem[] = [{ to: '/admin', label: 'Home', icon: Home, end: true }]

export const COORDINATOR_NAV: PortalNavItem[] = [
  { to: '/coordinator', label: 'Home', icon: Home, end: true },
]

export const TUTOR_NAV: PortalNavItem[] = [{ to: '/tutor', label: 'Home', icon: Home, end: true }]

export const CLIENT_NAV: PortalNavItem[] = [{ to: '/client', label: 'Home', icon: Home, end: true }]
