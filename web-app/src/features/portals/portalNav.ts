import {
  Bug,
  ClipboardList,
  Contact,
  DatabaseBackup,
  Home,
  KeyRound,
  Mail,
  MessageSquare,
  Newspaper,
  ScrollText,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react'

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

export const PORTALS: readonly PortalDefinition[] = [
  {
    role: 'super',
    path: '/super',
    title: 'Super portal',
    homeTitle: 'Activity log',
    description: 'Platform activity and audit trail.',
    nav: [
      { to: '/super', label: 'Activity log', icon: ScrollText, end: true },
      { to: '/super/errors', label: 'Error log', icon: Bug },
      { to: '/super/users', label: 'Users', icon: Users },
      { to: '/super/rbac', label: 'RBAC', icon: KeyRound },
      { to: '/super/backup', label: 'Backup', icon: DatabaseBackup },
      { to: '/super/settings', label: 'Settings', icon: Settings },
      { to: '/super/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  {
    role: 'admin',
    path: '/admin',
    title: 'Admin portal',
    homeTitle: 'Home',
    description: 'Platform analytics — revenue, users, tasks, and feedback.',
    nav: [
      { to: '/admin', label: 'Home', icon: Home, end: true },
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/tasks', label: 'Tasks', icon: ClipboardList },
      { to: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
      { to: '/admin/leads', label: 'Leads', icon: Newspaper },
      { to: '/admin/contact', label: 'Contact', icon: Contact },
      { to: '/admin/stay-updated', label: 'Stay updated', icon: Mail },
      { to: '/admin/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  {
    role: 'coordinator',
    path: '/coordinator',
    title: 'Coordinator portal',
    homeTitle: 'Coordinator home',
    description: 'Coordinator portal landing — tools will land here.',
    nav: [
      { to: '/coordinator', label: 'Home', icon: Home, end: true },
      { to: '/coordinator/tasks', label: 'Tasks', icon: ClipboardList },
      { to: '/coordinator/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  {
    role: 'tutor',
    path: '/tutor',
    title: 'Tutor portal',
    homeTitle: 'Tutor home',
    description: 'Tutor portal landing — tools will land here.',
    nav: [
      { to: '/tutor', label: 'Home', icon: Home, end: true },
      { to: '/tutor/tasks', label: 'Tasks', icon: ClipboardList },
      { to: '/tutor/feedback', label: 'Feedback', icon: MessageSquare },
      { to: '/tutor/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  {
    role: 'client',
    path: '/client',
    title: 'Client portal',
    homeTitle: 'Client home',
    description: 'Client portal landing — tools will land here.',
    nav: [
      { to: '/client', label: 'Home', icon: Home, end: true },
      { to: '/client/tasks', label: 'Tasks', icon: ClipboardList },
      { to: '/client/feedback', label: 'Feedback', icon: MessageSquare },
      { to: '/client/profile', label: 'Profile', icon: UserCircle },
    ],
  },
]
