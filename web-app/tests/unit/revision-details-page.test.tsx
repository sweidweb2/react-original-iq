import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RevisionDetailsPage } from '@/features/shared/revisions/RevisionDetailsPage'
import type { AuthRole } from '@/services/auth'
import {
  approveRevision,
  cancelRevision,
  getRevision,
  rejectRevision,
  type RevisionDetail,
  submitRevision,
  updateRevision,
} from '@/services/revisions'
import { getTask } from '@/services/tasks'
import { toastApiError, toastSuccess } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { permissionsFor } from '../helpers/permissions'

vi.mock('@/services/revisions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/revisions')>()
  return {
    ...actual,
    getRevision: vi.fn(),
    updateRevision: vi.fn(),
    cancelRevision: vi.fn(),
    approveRevision: vi.fn(),
    rejectRevision: vi.fn(),
    submitRevision: vi.fn(),
    cancelRevisionSubmit: vi.fn(),
  }
})

vi.mock('@/services/tasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/tasks')>()
  return { ...actual, getTask: vi.fn() }
})

vi.mock('@/services/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/toast')>()
  return { ...actual, toastApiError: vi.fn(), toastSuccess: vi.fn() }
})

const TIMESTAMP = '2026-10-01T10:00:00.000Z'

function makeRevision(overrides: Partial<RevisionDetail> = {}): RevisionDetail {
  return {
    id: 'rev-1',
    taskId: 'task-1',
    startDate: TIMESTAMP,
    deadline: null,
    submitDate: null,
    status: 'in-revision',
    title: 'Fix citations',
    description: 'Use APA style',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    solutions: [],
    ...overrides,
  }
}

function signInAs(role: AuthRole) {
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
}

async function renderPage(role: AuthRole, revision: RevisionDetail) {
  signInAs(role)
  vi.mocked(getRevision).mockResolvedValue(revision)
  render(
    <MemoryRouter initialEntries={[`/${role}/tasks/task-1/revisions/rev-1`]}>
      <Routes>
        <Route
          path={`/${role}/tasks/:taskId/revisions/:revisionId`}
          element={<RevisionDetailsPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
  expect(await screen.findByRole('heading', { level: 1, name: revision.title! })).toBeVisible()
}

const button = (name: string) => screen.queryByRole('button', { name })

describe('RevisionDetailsPage', () => {
  beforeEach(() => {
    vi.mocked(getTask).mockResolvedValue({ topic: 'Essay on Turing' } as never)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, tokens: null, isHydrated: true })
  })

  it('shows staff the edit and cancel actions, and approve/reject only when waiting', async () => {
    await renderPage('coordinator', makeRevision())
    expect(button('Edit revision')).toBeVisible()
    expect(button('Cancel session')).toBeVisible()
    expect(button('Approve')).not.toBeInTheDocument()
    expect(button('Submit revision')).not.toBeInTheDocument()
    cleanup()

    await renderPage('admin', makeRevision({ status: 'waiting_coordinator_approval' }))
    expect(button('Approve')).toBeVisible()
    expect(button('Reject')).toBeVisible()
  })

  it('hides cancel for finished sessions', async () => {
    await renderPage('super', makeRevision({ status: 'completed' }))
    expect(button('Edit revision')).toBeVisible()
    expect(button('Cancel session')).not.toBeInTheDocument()
  })

  it('lets the tutor submit an open revision and withdraw a pending one', async () => {
    await renderPage('tutor', makeRevision())
    expect(button('Submit revision')).toBeVisible()
    expect(button('Edit revision')).not.toBeInTheDocument()
    expect(button('Approve')).not.toBeInTheDocument()
    cleanup()

    await renderPage('tutor', makeRevision({ status: 'waiting_coordinator_approval' }))
    expect(button('Cancel submission')).toBeVisible()
    expect(button('Submit revision')).not.toBeInTheDocument()
  })

  it('gives clients a read-only view', async () => {
    await renderPage('client', makeRevision({ status: 'waiting_coordinator_approval' }))
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText('Use APA style')).toBeVisible()
    expect(screen.getByText('No revision solutions')).toBeVisible()
  })

  it('approves, updates the badge and reloads', async () => {
    const user = userEvent.setup()
    await renderPage('coordinator', makeRevision({ status: 'waiting_coordinator_approval' }))
    vi.mocked(approveRevision).mockResolvedValue(makeRevision({ status: 'completed' }))
    vi.mocked(getRevision).mockResolvedValue(makeRevision({ status: 'completed' }))

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(approveRevision).toHaveBeenCalledWith('rev-1')
    expect(toastSuccess).toHaveBeenCalledWith(
      'Revision approved',
      'The revision session is now completed.',
    )
    await waitFor(() => expect(getRevision).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Completed')).toBeVisible()
    expect(button('Approve')).not.toBeInTheDocument()
  })

  it('reports a failed action and keeps the current state', async () => {
    const user = userEvent.setup()
    await renderPage('coordinator', makeRevision({ status: 'waiting_coordinator_approval' }))
    const failure = new Error('nope')
    vi.mocked(rejectRevision).mockRejectedValue(failure)

    await user.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() =>
      expect(toastApiError).toHaveBeenCalledWith(failure, "Couldn't send the revision back"),
    )
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(getRevision).toHaveBeenCalledTimes(1)
    expect(button('Reject')).toBeEnabled()
  })

  it('submits as the tutor and cancels as staff', async () => {
    const user = userEvent.setup()
    await renderPage('tutor', makeRevision())
    vi.mocked(submitRevision).mockResolvedValue(
      makeRevision({ status: 'waiting_coordinator_approval' }),
    )
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))
    expect(submitRevision).toHaveBeenCalledWith('rev-1')
    cleanup()

    await renderPage('coordinator', makeRevision())
    vi.mocked(cancelRevision).mockResolvedValue(makeRevision({ status: 'cancelled' }))
    await user.click(screen.getByRole('button', { name: 'Cancel session' }))
    expect(cancelRevision).toHaveBeenCalledWith('rev-1')
  })

  it('saves edits from the dialog and closes it', async () => {
    const user = userEvent.setup()
    await renderPage('coordinator', makeRevision())
    vi.mocked(updateRevision).mockResolvedValue(makeRevision({ title: 'Fix all citations' }))

    await user.click(screen.getByRole('button', { name: 'Edit revision' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit revision' })
    const title = screen.getByLabelText('Title')
    expect(title).toHaveValue('Fix citations')
    await user.clear(title)
    await user.type(title, 'Fix all citations')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(updateRevision).toHaveBeenCalledWith('rev-1', {
      title: 'Fix all citations',
      description: 'Use APA style',
    })
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
  })

  it('shows a retryable error when the revision cannot load', async () => {
    signInAs('coordinator')
    vi.mocked(getRevision).mockRejectedValue(new Error('offline'))
    render(
      <MemoryRouter initialEntries={['/coordinator/tasks/task-1/revisions/rev-1']}>
        <Routes>
          <Route
            path="/coordinator/tasks/:taskId/revisions/:revisionId"
            element={<RevisionDetailsPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Could not load revision.')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load')

    vi.mocked(getRevision).mockResolvedValue(makeRevision())
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Fix citations' })).toBeVisible()
  })
})
