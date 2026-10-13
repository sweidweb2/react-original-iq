import { Home } from 'lucide-react'

import type { AuthRole } from '@/services/auth'

import type { PortalNavItem } from './PortalShell'

export type PortalDefinition = {
  role: AuthRole
  path: string
  title: string
  homeTitle: string
  description: string
  nav: PortalNavItem[]
}

function homeNav(path: string): PortalNavItem[] {
  return [{ to: path, label: 'Home', icon: Home, end: true }]
}

export const PORTALS: readonly PortalDefinition[] = [
  {
    role: 'admin',
    path: '/admin',
    title: 'Admin portal',
    homeTitle: 'Admin home',
    description: 'Admin portal landing — tools will land here.',
    nav: homeNav('/admin'),
  },
  {
    role: 'coordinator',
    path: '/coordinator',
    title: 'Coordinator portal',
    homeTitle: 'Coordinator home',
    description: 'Coordinator portal landing — tools will land here.',
    nav: homeNav('/coordinator'),
  },
  {
    role: 'tutor',
    path: '/tutor',
    title: 'Tutor portal',
    homeTitle: 'Tutor home',
    description: 'Tutor portal landing — tools will land here.',
    nav: homeNav('/tutor'),
  },
  {
    role: 'client',
    path: '/client',
    title: 'Client portal',
    homeTitle: 'Client home',
    description: 'Client portal landing — tools will land here.',
    nav: homeNav('/client'),
  },
]
