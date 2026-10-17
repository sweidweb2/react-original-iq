import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PortalDashboardPage } from '@/features/shared/dashboard/PortalDashboardPage'
import type { AuthRole } from '@/services/auth'
import { createTask, getTaskStats, listTasks, type Task, type TaskStats } from '@/services/tasks'
import { toastApiError, toastSuccess } from '@/services/toast'
import { listUsers, type ManagedUser } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { permissionsFor } from '../helpers/permissions'

vi.mock('@/services/tasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/tasks')>()
  return { ...actual, createTask: vi.fn(), getTaskStats: vi.fn(), listTasks: vi.fn() }
})

vi.mock('@/services/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/toast')>()
  return { ...actual, toastApiError: vi.fn(), toastSuccess: vi.fn() }
})

vi.mock('@/services/users', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/users')>()
  return { ...actual, listUsers: vi.fn() }
})

const TIMESTAMP = '2026-10-01T10:00:00.000Z'

function task(id: string, topic: string, status: Task['status']): Task {
  return {
    id,
    clientId: 'client-1',
    tutorId: null,
    coordinatorId: 'coord-1',
    topic,
    type: 'assignment',
    description: null,
    isAssigned: false,
    status,
    deadline: null,
    price: 0,
    paymentStatus: 'unpaid',
    category: null,
    feedback: null,
    allowView: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  }
}

const stats: TaskStats = {
  total: 9,
  pending: 2,
  'in-progress': 4,
  waiting_coordinator_approval: 3,
  completed: 0,
  cancelled: 0,
}

const recent = [task('t-1', 'Essay on Turing', 'pending'), task('t-2', 'Lab report', 'in-progress')]

function renderAs(role: AuthRole) {
  useAuthStore.setState({
    user: {
      id: `${role}-1`,
      email: `${role}@example.com`,
      role,
      permissions: permissionsFor(role),
      profile: null,
    },
    tokens: null,
    isHydrated: true,
  })
  render(
    <MemoryRouter>
      <PortalDashboardPage />
    </MemoryRouter>,
  )
}

function kpi(label: string) {
  return screen.getByText(label, { selector: 'p' }).parentElement
}

describe('PortalDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(listTasks).mockResolvedValue({
      data: recent,
      meta: { page: 1, limit: 5, total: recent.length },
    })
    vi.mocked(getTaskStats).mockResolvedValue(stats)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, tokens: null, isHydrated: true })
  })

  it('shows coordinator KPIs and the recent queue', async () => {
    renderAs('coordinator')

    expect(screen.getByRole('heading', { level: 1, name: 'Coordinator dashboard' })).toBeVisible()
    expect(await screen.findByText('Essay on Turing')).toBeVisible()
    expect(kpi('Assigned tasks')).toHaveTextContent('9')
    expect(kpi('Pending review')).toHaveTextContent('3')
    expect(kpi('Pending')).toHaveTextContent('2')
    expect(listTasks).toHaveBeenCalledWith({ page: 1, limit: 5 })
    expect(screen.getAllByRole('link', { name: 'Open' })[0]).toHaveAttribute(
      'href',
      '/coordinator/tasks/t-1',
    )
  })

  it('makes coordinators pick a client and sends it with the new task', async () => {
    const user = userEvent.setup()
    vi.mocked(listUsers).mockResolvedValue({
      data: [
        {
          id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          email: 'ada@example.com',
          profile: { displayName: 'Ada' },
        },
      ],
      meta: { page: 1, limit: 100, total: 1 },
    } as unknown as Awaited<ReturnType<typeof listUsers>> & { data: ManagedUser[] })
    vi.mocked(createTask).mockResolvedValue(task('t-4', 'Calculus prep', 'pending'))
    renderAs('coordinator')
    await screen.findByText('Essay on Turing')

    await user.click(screen.getByRole('button', { name: 'Create task' }))
    expect(listUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
      role: 'client',
      status: 'ACTIVE',
    })
    await user.type(screen.getByLabelText('Topic'), 'Calculus prep')
    await user.type(screen.getByLabelText('Category'), 'Math')
    fireEvent.change(screen.getByLabelText('Deadline'), { target: { value: '2026-11-03T10:00' } })
    await user.type(screen.getByLabelText('Description'), 'Limits')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(screen.getByText('Select a client')).toBeVisible()
    expect(createTask).not.toHaveBeenCalled()

    await user.selectOptions(
      await screen.findByLabelText('Client'),
      '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    )
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(createTask).toHaveBeenCalledWith({
      topic: 'Calculus prep',
      type: 'assignment',
      category: 'Math',
      description: 'Limits',
      clientId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      deadline: new Date('2026-11-03T10:00').toISOString(),
    })
    expect(toastSuccess).toHaveBeenCalledWith(
      'Task created',
      '“Calculus prep” was added to the task list.',
    )
  })

  it('shows tutor KPIs with a link to the task list', async () => {
    renderAs('tutor')

    expect(screen.getByRole('heading', { level: 1, name: 'Tutor dashboard' })).toBeVisible()
    expect(await screen.findByText('Lab report')).toBeVisible()
    expect(kpi('Awaiting approval')).toHaveTextContent('3')
    expect(screen.getByRole('link', { name: 'View tasks' })).toHaveAttribute('href', '/tutor/tasks')
  })

  it('gives clients a request form and their recent requests, without stats', async () => {
    renderAs('client')

    expect(screen.getByRole('heading', { level: 1, name: 'Client dashboard' })).toBeVisible()
    expect(screen.getByText('Signed in as')).toHaveTextContent('client@example.com')
    expect(await screen.findByText('Essay on Turing')).toBeVisible()
    expect(getTaskStats).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/client/tasks')
  })

  it('validates the client request before calling the API', async () => {
    const user = userEvent.setup()
    renderAs('client')
    await screen.findByText('Essay on Turing')

    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(createTask).not.toHaveBeenCalled()
    for (const message of [
      'Topic is required',
      'Category is required',
      'Deadline is required',
      'Description is required',
    ]) {
      expect(screen.getByText(message)).toBeVisible()
    }
  })

  it('submits a client request with an ISO deadline, then clears the form and reloads', async () => {
    const user = userEvent.setup()
    vi.mocked(createTask).mockResolvedValue(task('t-3', 'Thesis outline', 'pending'))
    renderAs('client')
    await screen.findByText('Essay on Turing')

    await user.type(screen.getByLabelText('Topic'), 'Thesis outline')
    await user.selectOptions(screen.getByLabelText('Type'), 'research')
    await user.type(screen.getByLabelText('Category'), 'History')
    fireEvent.change(screen.getByLabelText('Deadline'), { target: { value: '2026-11-01T09:30' } })
    await user.type(screen.getByLabelText('Description'), 'Two pages')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(createTask).toHaveBeenCalledWith({
      topic: 'Thesis outline',
      type: 'research',
      category: 'History',
      description: 'Two pages',
      deadline: new Date('2026-11-01T09:30').toISOString(),
    })
    expect(toastSuccess).toHaveBeenCalledWith(
      'Request submitted',
      '“Thesis outline” was sent. A coordinator will review it and assign a tutor.',
    )
    expect(screen.getByLabelText('Topic')).toHaveValue('')
    await waitFor(() => expect(listTasks).toHaveBeenCalledTimes(2))
  })

  it('keeps the client input when the request fails', async () => {
    const user = userEvent.setup()
    const failure = new Error('nope')
    vi.mocked(createTask).mockRejectedValue(failure)
    renderAs('client')
    await screen.findByText('Essay on Turing')

    await user.type(screen.getByLabelText('Topic'), 'Thesis outline')
    await user.type(screen.getByLabelText('Category'), 'History')
    fireEvent.change(screen.getByLabelText('Deadline'), { target: { value: '2026-11-02T08:00' } })
    await user.type(screen.getByLabelText('Description'), 'Two pages')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(createTask).toHaveBeenCalledTimes(1)
    expect(toastApiError).toHaveBeenCalledWith(failure, "Couldn't submit “Thesis outline”")
    expect(screen.getByLabelText('Topic')).toHaveValue('Thesis outline')
  })

  it('shows an empty preview and a retryable error', async () => {
    vi.mocked(listTasks).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    renderAs('client')

    const alert = await screen.findByRole('alert')
    vi.mocked(listTasks).mockResolvedValue({ data: [], meta: { page: 1, limit: 5, total: 0 } })
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('No tasks to preview')).toBeVisible()
  })
})
