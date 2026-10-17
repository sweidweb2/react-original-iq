import { describe, expect, it } from 'vitest'

import {
  permissionKeysForRole,
  RBAC_PERMISSIONS,
  RBAC_ROLES,
  RETIRED_PERMISSION_KEYS,
} from '../../src/authz/permission-catalog.js'
import { roleSchema } from '../../src/modules/auth/auth.schema.js'
import { createPermissionBodySchema } from '../../src/modules/rbac/rbac.schema.js'

const keys = RBAC_PERMISSIONS.map((permission) => permission.key)

describe('rbac catalog', () => {
  it('seeds every runtime role', () => {
    expect(RBAC_ROLES.map((role) => role.key).sort()).toEqual([...roleSchema.options].sort())
  })

  it('has unique keys that pass the permission schema', () => {
    expect(new Set(keys).size).toBe(keys.length)
    for (const permission of RBAC_PERMISSIONS) {
      const parsed = createPermissionBodySchema.safeParse({
        key: permission.key,
        name: permission.name,
        category: permission.category,
      })
      expect(parsed.success, permission.key).toBe(true)
      expect(permission.section.length, permission.key).toBeGreaterThan(0)
    }
  })

  it('grants every permission to at least one role, without duplicates', () => {
    for (const permission of RBAC_PERMISSIONS) {
      expect(permission.roles.length, permission.key).toBeGreaterThan(0)
      expect(new Set(permission.roles).size, permission.key).toBe(permission.roles.length)
    }
  })

  it('does not reuse retired keys', () => {
    for (const retired of RETIRED_PERMISSION_KEYS) {
      expect(keys).not.toContain(retired)
    }
  })

  it('matches the doc 02 capability matrix', () => {
    const client = permissionKeysForRole('client')
    const tutor = permissionKeysForRole('tutor')
    const coordinator = permissionKeysForRole('coordinator')
    const admin = permissionKeysForRole('admin')

    expect(client).toEqual(
      expect.arrayContaining([
        'create_own_tasks',
        'pay_own_tasks',
        'submit_feedback',
        'download_invoices',
      ]),
    )
    expect(client).not.toEqual(
      expect.arrayContaining(['create_tasks', 'assign_tutors', 'set_pricing']),
    )

    expect(tutor).toEqual(
      expect.arrayContaining(['submit_work', 'submit_revisions', 'upload_solutions']),
    )
    expect(coordinator).toEqual(
      expect.arrayContaining([
        'create_tasks',
        'assign_tutors',
        'set_pricing',
        'cancel_tasks',
        'approve_deliveries',
        'create_revisions',
        'manage_revisions',
        'evaluate_tutors',
        'delete_users',
      ]),
    )

    const payments = RBAC_PERMISSIONS.filter((item) => item.category === 'payments')
    expect(payments.length).toBeGreaterThan(0)
    for (const { key } of payments) {
      expect(coordinator, key).not.toContain(key)
      expect(tutor, key).not.toContain(key)
    }
    for (const adminOnly of [
      'toggle_allow_view',
      'change_coordinator',
      'manage_payments',
      'download_invoices',
      'create_users',
      'activate_users',
      'change_user_roles',
      'manage_leads',
    ]) {
      expect(coordinator, adminOnly).not.toContain(adminOnly)
      expect(admin, adminOnly).toContain(adminOnly)
    }
  })

  it('gives super every permission and keeps platform pages on super only', () => {
    expect(permissionKeysForRole('super').sort()).toEqual([...keys].sort())
    for (const key of [
      'manage_rbac',
      'manage_system',
      'manage_backups',
      'view_error_logs',
      'delete_error_logs',
      'export_data',
      'manage_super_users',
      'assign_user_permissions',
    ]) {
      const permission = RBAC_PERMISSIONS.find((item) => item.key === key)
      expect(permission?.roles, key).toEqual(['super'])
    }
  })

  it('falls back to no permissions for unknown roles', () => {
    expect(permissionKeysForRole('support')).toEqual([])
  })
})
