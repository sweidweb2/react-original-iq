import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AssignPermissionsDialog } from '@/features/super/rbac/AssignPermissionsDialog'
import { assignRolePermissions, type RbacPermission, type RbacRole } from '@/services/rbac'
import { toastApiError, toastSuccess } from '@/services/toast'

vi.mock('@/services/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/rbac')>()
  return { ...actual, assignRolePermissions: vi.fn() }
})

vi.mock('@/services/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/toast')>()
  return { ...actual, toastApiError: vi.fn(), toastSuccess: vi.fn() }
})

const TIMESTAMP = '2026-10-01T10:00:00.000Z'

function permission(id: string, key: string, category: string): RbacPermission {
  return {
    id,
    key,
    name: key.replace(/_/g, ' '),
    description: null,
    category,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  }
}

const permissions = [
  permission('p-approve', 'tasks_approve', 'tasks'),
  permission('p-export', 'users_export', 'users'),
  permission('p-assign', 'tasks_assign', 'tasks'),
  permission('p-backup', 'backups_run', 'backups'),
]

const role: RbacRole = {
  id: 'role-1',
  key: 'support_lead',
  name: 'Support lead',
  description: null,
  isSystem: false,
  sortOrder: 10,
  permissionIds: ['p-approve'],
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
}

function renderDialog(overrides: Partial<Parameters<typeof AssignPermissionsDialog>[0]> = {}) {
  const props = {
    open: true,
    role,
    permissions,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    ...overrides,
  }
  render(<AssignPermissionsDialog {...props} />)
  return props
}

describe('AssignPermissionsDialog', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('groups permissions by category alphabetically and preselects the role grants', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Assign permissions — Support lead' })).toBeVisible()
    const keys = screen.getAllByRole('checkbox').map((box) => box.closest('label')?.textContent)
    expect(keys).toEqual([
      'backups runbackups_run',
      'tasks approvetasks_approve',
      'tasks assigntasks_assign',
      'users exportusers_export',
    ])
    expect(screen.getByRole('checkbox', { name: /tasks_approve/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /tasks_assign/ })).not.toBeChecked()
  })

  it('saves the toggled selection and closes', async () => {
    const user = userEvent.setup()
    vi.mocked(assignRolePermissions).mockResolvedValue({
      ...role,
      permissionIds: ['p-export', 'p-backup'],
    })
    const props = renderDialog()

    await user.click(screen.getByRole('checkbox', { name: /tasks_approve/ }))
    await user.click(screen.getByRole('checkbox', { name: /users_export/ }))
    await user.click(screen.getByRole('checkbox', { name: /backups_run/ }))
    await user.click(screen.getByRole('button', { name: 'Save assignment' }))

    expect(assignRolePermissions).toHaveBeenCalledWith('role-1', ['p-export', 'p-backup'])
    expect(toastSuccess).toHaveBeenCalledWith(
      'Permissions saved',
      '“Support lead” now has 2 permissions.',
    )
    expect(props.onSaved).toHaveBeenCalled()
    expect(props.onClose).toHaveBeenCalled()
  })

  it('keeps the dialog open and reports an error when saving fails', async () => {
    const user = userEvent.setup()
    const failure = new Error('nope')
    vi.mocked(assignRolePermissions).mockRejectedValue(failure)
    const props = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Save assignment' }))

    await waitFor(() =>
      expect(toastApiError).toHaveBeenCalledWith(
        failure,
        "Couldn't save permissions for “Support lead”",
      ),
    )
    expect(props.onSaved).not.toHaveBeenCalled()
    expect(props.onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save assignment' })).toBeEnabled()
  })

  it('explains when no permissions exist yet', () => {
    renderDialog({ permissions: [] })
    expect(screen.getByText('No permissions yet. Create some first.')).toBeVisible()
  })
})
