import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ManageUsersPage } from '@/features/admin/users/ManageUsersPage'
import type { AuthRole } from '@/services/auth'
import { toastApiError, toastSuccess } from '@/services/toast'
import {
  deactivateUser,
  getUserStats,
  listUsers,
  type ManagedUser,
  updateUser,
  type UserStats,
} from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { permissionsFor } from '../helpers/permissions'

vi.mock('@/services/users', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/users')>()
  return {
    ...actual,
    listUsers: vi.fn(),
    getUserStats: vi.fn(),
    deactivateUser: vi.fn(),
    updateUser: vi.fn(),
  }
})

vi.mock('@/services/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/toast')>()
  return { ...actual, toastApiError: vi.fn(), toastSuccess: vi.fn() }
})

const TIMESTAMP = '2026-10-01T10:00:00.000Z'

function managedUser(
  id: string,
  role: AuthRole,
  name: string,
  status: ManagedUser['status'] = 'ACTIVE',
): ManagedUser {
  return {
    id,
    email: `${id}@example.com`,
    role,
    status,
    profile: { firstName: null, lastName: null, displayName: name },
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  }
}

const stats: UserStats = {
  total: 4,
  active: 3,
  inactive: 1,
  byRole: { super: 1, admin: 1, coordinator: 0, tutor: 0, client: 2 },
}

const directory = [
  managedUser('me', 'admin', 'Me Admin'),
  managedUser('boss', 'super', 'Sam Super'),
  managedUser('ada', 'client', 'Ada Client'),
  managedUser('ben', 'client', 'Ben Client', 'INACTIVE'),
]

function signInAs(role: AuthRole) {
  useAuthStore.setState({
    user: {
      id: 'me',
      email: 'me@example.com',
      role,
      permissions: permissionsFor(role),
      profile: null,
    },
    tokens: null,
    isHydrated: true,
  })
}

async function renderPage(role: AuthRole = 'admin') {
  signInAs(role)
  render(
    <MemoryRouter>
      <ManageUsersPage />
    </MemoryRouter>,
  )
  return screen.findByRole('table', { name: 'Users' })
}

function rowFor(name: string) {
  return screen.getByRole('cell', { name: new RegExp(`^${name}`) }).closest('tr')!
}

describe('ManageUsersPage', () => {
  beforeEach(() => {
    vi.mocked(listUsers).mockResolvedValue({
      data: directory,
      meta: { page: 1, limit: 10, total: directory.length },
    })
    vi.mocked(getUserStats).mockResolvedValue(stats)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, tokens: null, isHydrated: true })
  })

  it('lists users with stats and the first page query', async () => {
    await renderPage()

    expect(listUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: undefined,
      role: undefined,
      status: undefined,
    })
    expect(screen.getByRole('button', { name: /Total users\s*4/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Showing 1–4 of 4')).toBeVisible()
    expect(within(rowFor('Ben Client')).getByText('Inactive')).toBeVisible()
  })

  it('locks super accounts and the signed-in user for an admin', async () => {
    await renderPage('admin')

    const self = within(rowFor('Me Admin'))
    expect(self.getByText('You')).toBeVisible()
    expect(self.getByRole('switch', { name: 'Your account stays active' })).toBeDisabled()

    const boss = within(rowFor('Sam Super'))
    expect(
      boss.getByRole('switch', { name: "You can't change access for Sam Super" }),
    ).toBeDisabled()
    expect(boss.getByRole('button', { name: "You can't edit Sam Super" })).toBeDisabled()

    expect(
      within(rowFor('Ada Client')).getByRole('button', { name: 'Edit Ada Client' }),
    ).toBeEnabled()
  })

  it('lets super manage super accounts', async () => {
    await renderPage('super')
    const boss = within(rowFor('Sam Super'))
    expect(boss.getByRole('switch', { name: 'Deactivate Sam Super' })).toBeEnabled()
    expect(boss.getByRole('button', { name: 'Edit Sam Super' })).toBeEnabled()
  })

  it('confirms before deactivating, then reloads the directory', async () => {
    const user = userEvent.setup()
    vi.mocked(deactivateUser).mockResolvedValue(
      managedUser('ada', 'client', 'Ada Client', 'INACTIVE'),
    )
    await renderPage()

    await user.click(screen.getByRole('switch', { name: 'Deactivate Ada Client' }))
    const dialog = screen.getByRole('dialog', { name: 'Deactivate user' })
    expect(deactivateUser).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))

    expect(deactivateUser).toHaveBeenCalledWith('ada')
    expect(toastSuccess).toHaveBeenCalledWith(
      'User deactivated',
      'Ada Client can no longer sign in.',
    )
    await waitFor(() => expect(listUsers).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('dialog', { name: 'Deactivate user' })).not.toBeInTheDocument()
  })

  it('reactivates through updateUser and reports failures', async () => {
    const user = userEvent.setup()
    const failure = new Error('nope')
    vi.mocked(updateUser).mockRejectedValue(failure)
    await renderPage()

    await user.click(screen.getByRole('switch', { name: 'Activate Ben Client' }))
    const dialog = screen.getByRole('dialog', { name: 'Activate user' })
    await user.click(within(dialog).getByRole('button', { name: 'Activate' }))

    expect(updateUser).toHaveBeenCalledWith('ben', { status: 'ACTIVE' })
    expect(toastApiError).toHaveBeenCalledWith(failure, "Couldn't activate Ben Client")
    expect(dialog).toBeInTheDocument()
  })

  it('filters by a stat card and resets to page 1', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /Clients\s*2/ }))

    await waitFor(() =>
      expect(listUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, role: 'client', status: undefined }),
      ),
    )
    expect(screen.getByRole('button', { name: /Clients\s*2/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows an empty state with a filter hint', async () => {
    const user = userEvent.setup()
    await renderPage()
    vi.mocked(listUsers).mockResolvedValue({ data: [], meta: { page: 1, limit: 10, total: 0 } })

    await user.selectOptions(screen.getByLabelText('Status'), 'INACTIVE')

    expect(await screen.findByText('No users found')).toBeVisible()
    expect(screen.getByText('Try a different search or clear the filters.')).toBeVisible()
  })
})
