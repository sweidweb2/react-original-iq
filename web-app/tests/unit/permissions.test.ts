import { describe, expect, it } from 'vitest'

import {
  assignableRoles,
  canManageRole,
  hasPermission,
  type PermissionKey,
} from '@/lib/permissions'
import type { AuthRole } from '@/services/auth'

import { CATALOG_PERMISSION_KEYS, permissionsFor } from '../helpers/permissions'

const ALL_ROLES: AuthRole[] = ['super', 'admin', 'coordinator', 'tutor', 'client']

function actor(role: AuthRole | null) {
  return role ? { permissions: permissionsFor(role) } : null
}

function manageable(role: AuthRole | null): AuthRole[] {
  return ALL_ROLES.filter((target) => canManageRole(actor(role), target))
}

/** Every web key must exist in the backend catalog, and vice versa. */
const WEB_KEYS = {
  view_users: true,
  create_users: true,
  manage_users: true,
  reset_user_passwords: true,
  manage_super_users: true,
  manage_admins: true,
  manage_coordinators: true,
  manage_tutors: true,
  manage_clients: true,
  change_user_roles: true,
  activate_users: true,
  delete_users: true,
  assign_user_permissions: true,
  manage_specializations: true,
  view_activity_logs: true,
  view_error_logs: true,
  manage_rbac: true,
  manage_backups: true,
  manage_system: true,
  view_dashboard: true,
  view_reports: true,
  export_data: true,
  send_custom_emails: true,
  manage_leads: true,
  manage_contact_messages: true,
  manage_newsletter: true,
  view_tasks: true,
  view_all_tasks: true,
  create_own_tasks: true,
  create_tasks: true,
  edit_own_tasks: true,
  edit_tasks: true,
  delete_own_tasks: true,
  delete_tasks: true,
  assign_tutors: true,
  change_coordinator: true,
  set_pricing: true,
  cancel_tasks: true,
  toggle_allow_view: true,
  approve_deliveries: true,
  submit_work: true,
  download_task_documents: true,
  upload_task_documents: true,
  delete_task_documents: true,
  download_solutions: true,
  upload_solutions: true,
  delete_solutions: true,
  bulk_download_files: true,
  view_revisions: true,
  create_revisions: true,
  manage_revisions: true,
  submit_revisions: true,
  view_payment_summary: true,
  view_payments: true,
  pay_own_tasks: true,
  manage_payments: true,
  manage_refunds: true,
  download_invoices: true,
  manage_invoices: true,
  view_feedback: true,
  submit_feedback: true,
  delete_feedback: true,
  evaluate_tutors: true,
  manage_own_profile: true,
  delete_own_account: true,
} satisfies Record<PermissionKey, true>

describe('permission keys', () => {
  it('match the backend catalog', () => {
    expect(Object.keys(WEB_KEYS).sort()).toEqual([...CATALOG_PERMISSION_KEYS].sort())
  })
})

describe('hasPermission', () => {
  it('passes when any listed key is granted', () => {
    const user = { permissions: ['view_tasks'] }
    expect(hasPermission(user, 'view_tasks')).toBe(true)
    expect(hasPermission(user, ['view_all_tasks', 'view_tasks'])).toBe(true)
    expect(hasPermission(user, 'view_all_tasks')).toBe(false)
  })

  it('denies when permissions are missing', () => {
    expect(hasPermission(null, 'view_tasks')).toBe(false)
    expect(hasPermission({}, 'view_tasks')).toBe(false)
  })
})

describe('canManageRole', () => {
  it('lets super manage every role, including super', () => {
    expect(manageable('super')).toEqual(ALL_ROLES)
  })

  it('lets admin manage everything below super', () => {
    expect(manageable('admin')).toEqual(['admin', 'coordinator', 'tutor', 'client'])
  })

  it('limits coordinators to tutors and clients', () => {
    expect(manageable('coordinator')).toEqual(['tutor', 'client'])
  })

  it('never offers super accounts to non-super actors', () => {
    for (const role of ['admin', 'coordinator', 'tutor', 'client', null] as const) {
      expect(canManageRole(actor(role), 'super')).toBe(false)
    }
  })

  it('follows permissions rather than the role name', () => {
    expect(canManageRole({ permissions: ['manage_admins'] }, 'admin')).toBe(true)
    expect(canManageRole({ permissions: [] }, 'client')).toBe(false)
  })
})

describe('assignableRoles', () => {
  it('returns the role options the actor may assign, in display order', () => {
    expect(assignableRoles(actor('super')).map((option) => option.value)).toEqual(ALL_ROLES)
    expect(assignableRoles(actor('admin')).map((option) => option.label)).toEqual([
      'Admin',
      'Coordinator',
      'Tutor',
      'Client',
    ])
    expect(assignableRoles(actor('coordinator')).map((option) => option.value)).toEqual([
      'tutor',
      'client',
    ])
  })
})
