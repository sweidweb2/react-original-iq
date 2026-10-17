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

import type { PermissionKey } from '@/lib/permissions'
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

const TASKS: readonly PermissionKey[] = ['view_tasks', 'view_all_tasks']

export const PORTALS: readonly PortalDefinition[] = [
  {
    role: 'super',
    path: '/super',
    title: 'Super portal',
    homeTitle: 'Activity log',
    description: 'Platform activity and audit trail.',
    nav: [
      {
        to: '/super',
        label: 'Activity log',
        icon: ScrollText,
        end: true,
        permission: 'view_activity_logs',
      },
      { to: '/super/errors', label: 'Error log', icon: Bug, permission: 'view_error_logs' },
      { to: '/super/users', label: 'Users', icon: Users, permission: 'view_users' },
      { to: '/super/rbac', label: 'RBAC', icon: KeyRound, permission: 'manage_rbac' },
      {
        to: '/super/backup',
        label: 'Backup',
        icon: DatabaseBackup,
        permission: 'manage_backups',
      },
      { to: '/super/settings', label: 'Settings', icon: Settings, permission: 'manage_system' },
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
      { to: '/admin', label: 'Home', icon: Home, end: true, permission: 'view_reports' },
      { to: '/admin/users', label: 'Users', icon: Users, permission: 'view_users' },
      { to: '/admin/tasks', label: 'Tasks', icon: ClipboardList, permission: TASKS },
      {
        to: '/admin/feedback',
        label: 'Feedback',
        icon: MessageSquare,
        permission: 'view_feedback',
      },
      { to: '/admin/leads', label: 'Leads', icon: Newspaper, permission: 'manage_leads' },
      {
        to: '/admin/contact',
        label: 'Contact',
        icon: Contact,
        permission: 'manage_contact_messages',
      },
      {
        to: '/admin/stay-updated',
        label: 'Stay updated',
        icon: Mail,
        permission: 'manage_newsletter',
      },
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
      { to: '/coordinator', label: 'Home', icon: Home, end: true, permission: 'view_dashboard' },
      { to: '/coordinator/tasks', label: 'Tasks', icon: ClipboardList, permission: TASKS },
      {
        to: '/coordinator/feedback',
        label: 'Feedback',
        icon: MessageSquare,
        permission: 'view_feedback',
      },
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
      { to: '/tutor', label: 'Home', icon: Home, end: true, permission: 'view_dashboard' },
      { to: '/tutor/tasks', label: 'Tasks', icon: ClipboardList, permission: TASKS },
      {
        to: '/tutor/feedback',
        label: 'Feedback',
        icon: MessageSquare,
        permission: 'view_feedback',
      },
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
      { to: '/client', label: 'Home', icon: Home, end: true, permission: 'view_dashboard' },
      { to: '/client/tasks', label: 'Tasks', icon: ClipboardList, permission: TASKS },
      {
        to: '/client/feedback',
        label: 'Feedback',
        icon: MessageSquare,
        permission: 'view_feedback',
      },
      { to: '/client/profile', label: 'Profile', icon: UserCircle },
    ],
  },
]
