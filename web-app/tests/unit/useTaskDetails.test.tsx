import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { FormEvent, ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { toast } from '@/components/ui/toast'
import { useTaskDetails } from '@/features/shared/tasks/useTaskDetails'
import type { AuthUser } from '@/services/auth'
import { listRevisionsForTask, type RevisionSession } from '@/services/revisions'
import {
  approveTask,
  deleteTask,
  deleteTaskFile,
  getTask,
  type Task,
  type TaskDetail,
  type TaskFile,
  updateTaskPrice,
  uploadTaskFile,
} from '@/services/tasks'
import { toastApiError, toastInvalid, toastSuccess } from '@/services/toast'
import { listUsers, type ManagedUser } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { permissionsFor } from '../helpers/permissions'

vi.mock('@/services/tasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/tasks')>()
  return {
    ...actual,
    getTask: vi.fn(),
    updateTaskPrice: vi.fn(),
    approveTask: vi.fn(),
    deleteTask: vi.fn(),
    deleteTaskFile: vi.fn(),
    uploadTaskFile: vi.fn(),
  }
})

vi.mock('@/services/revisions', () => ({
  listRevisionsForTask: vi.fn(),
  createRevision: vi.fn(),
}))

vi.mock('@/services/users', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/users')>()
  return { ...actual, listUsers: vi.fn() }
})

vi.mock('@/services/toast', () => ({
  toastApiError: vi.fn(),
  toastInvalid: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

const TIMESTAMP = '2026-10-01T10:00:00.000Z'

function taskFile(id: string, originalName: string): TaskFile {
  return {
    id,
    taskId: 'task-1',
    fileLocation: `tasks/task-1/${id}`,
    note: null,
    originalName,
    contentType: 'application/pdf',
    sizeBytes: 1024,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  }
}

function makeTask(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    id: 'task-1',
    clientId: 'client-1',
    tutorId: null,
    coordinatorId: 'coord-1',
    topic: 'Essay on Turing',
    type: 'research',
    description: 'Five pages',
    isAssigned: false,
    status: 'pending',
    deadline: '2026-11-01T12:00:00.000Z',
    price: 0,
    paymentStatus: 'unpaid',
    category: 'History',
    feedback: null,
    allowView: true,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    files: [],
    solutions: [],
    ...overrides,
  }
}

/** Mutations return the bare task row, without files or solutions. */
function taskRow(overrides: Partial<Task> = {}): Task {
  const row: Partial<TaskDetail> = makeTask(overrides)
  delete row.files
  delete row.solutions
  return row as Task
}

const revision: RevisionSession = {
  id: 'rev-1',
  taskId: 'task-1',
  startDate: null,
  deadline: null,
  submitDate: null,
  status: 'in-revision',
  title: 'Fix citations',
  description: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
}

function managedUser(id: string, role: ManagedUser['role']): ManagedUser {
  return {
    id,
    email: `${id}@example.com`,
    role,
    status: 'ACTIVE',
    profile: { firstName: null, lastName: null, displayName: null },
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  }
}

function signInAs(role: AuthUser['role'], id = `${role}-1`) {
  useAuthStore.setState({
    user: {
      id,
      email: `${id}@example.com`,
      role,
      permissions: permissionsFor(role),
      profile: { firstName: 'Ada', lastName: 'Lovelace', displayName: 'Ada Lovelace' },
    },
    tokens: null,
    isHydrated: true,
  })
}

const formEvent = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent

function renderTaskDetails(path = '/admin/tasks/task-1') {
  const location = { current: path }
  function TrackLocation() {
    location.current = useLocation().pathname
    return null
  }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <TrackLocation />
        <Routes>
          <Route path="/:portal/tasks/:taskId" element={children} />
          <Route path="/:portal/tasks" element={null} />
        </Routes>
      </MemoryRouter>
    )
  }
  const hook = renderHook(() => useTaskDetails(), { wrapper: Wrapper })
  return { hook, location }
}

async function renderLoaded(path?: string) {
  const rendered = renderTaskDetails(path)
  await waitFor(() => expect(rendered.hook.result.current.isLoading).toBe(false))
  return rendered
}

describe('useTaskDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTask).mockResolvedValue(makeTask())
    vi.mocked(listRevisionsForTask).mockResolvedValue({ data: [revision] })
    vi.mocked(listUsers).mockImplementation(async (query) => ({
      data: [managedUser(`${query.role}-a`, query.role ?? 'tutor')],
      meta: { page: 1, limit: 100, total: 1 },
    }))
    signInAs('admin')
  })

  afterEach(() => {
    cleanup()
    useAuthStore.setState({ user: null, tokens: null, isHydrated: true })
  })

  describe('loading', () => {
    it('loads the task and its revisions from the route and fills the forms', async () => {
      vi.mocked(getTask).mockResolvedValue(makeTask({ price: 49.5, tutorId: 'tutor-9' }))
      const { hook } = await renderLoaded('/coordinator/tasks/task-1')
      const model = hook.result.current

      expect(getTask).toHaveBeenCalledWith('task-1')
      expect(listRevisionsForTask).toHaveBeenCalledWith('task-1')
      expect(model.taskId).toBe('task-1')
      expect(model.tasksBase).toBe('/coordinator/tasks')
      expect(model.task?.topic).toBe('Essay on Turing')
      expect(model.revisions).toEqual([revision])
      expect(model.priceValue).toBe('49.5')
      expect(model.editTopic).toBe('Essay on Turing')
      expect(model.editType).toBe('research')
      expect(model.editCategory).toBe('History')
      expect(model.editDescription).toBe('Five pages')
      expect(model.selectedCoordId).toBe('coord-1')
      expect(model.selectedTutorId).toBe('tutor-9')
      expect(model.error).toBeNull()
    })

    it('still shows the task when the revision list fails', async () => {
      vi.mocked(listRevisionsForTask).mockRejectedValue(new Error('forbidden'))
      const { hook } = await renderLoaded()

      expect(hook.result.current.task?.id).toBe('task-1')
      expect(hook.result.current.revisions).toEqual([])
      expect(hook.result.current.error).toBeNull()
    })

    it('exposes the load error and retries on reload', async () => {
      const failure = new Error('not found')
      vi.mocked(getTask).mockRejectedValueOnce(failure)
      const { hook } = await renderLoaded()

      expect(hook.result.current.error).toBe(failure)
      expect(hook.result.current.task).toBeNull()

      act(() => hook.result.current.reload())

      await waitFor(() => expect(hook.result.current.task?.id).toBe('task-1'))
      expect(hook.result.current.error).toBeNull()
      expect(getTask).toHaveBeenCalledTimes(2)
    })
  })

  describe('role permissions', () => {
    it('gives admins full staff access and loads tutors and coordinators', async () => {
      const { hook } = await renderLoaded()
      await waitFor(() => expect(hook.result.current.coordinatorsLoading).toBe(false))
      await waitFor(() => expect(hook.result.current.tutorsLoading).toBe(false))
      const model = hook.result.current

      expect(model).toMatchObject({
        canAssignTutors: true,
        canChangeCoordinator: true,
        canToggleAllowView: true,
        canViewPayments: true,
        canViewRevisions: true,
        canCreateRevisions: true,
        canEditFields: true,
        canDelete: true,
        canSubmit: false,
      })
      expect(listUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
        role: 'tutor',
        status: 'ACTIVE',
      })
      expect(listUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
        role: 'coordinator',
        status: 'ACTIVE',
      })
      expect(model.tutors.map((user) => user.id)).toEqual(['tutor-a'])
      expect(model.coordinators.map((user) => user.id)).toEqual(['coordinator-a'])
    })

    it('loads only tutors for coordinators', async () => {
      signInAs('coordinator')
      const { hook } = await renderLoaded()
      await waitFor(() => expect(hook.result.current.tutorsLoading).toBe(false))

      expect(hook.result.current.canAssignTutors).toBe(true)
      expect(hook.result.current.canChangeCoordinator).toBe(false)
      expect(hook.result.current.canToggleAllowView).toBe(false)
      expect(hook.result.current.canSetPrice).toBe(true)
      expect(hook.result.current.canViewPaymentSummary).toBe(false)
      expect(hook.result.current.canViewPayments).toBe(false)
      expect(listUsers).toHaveBeenCalledTimes(1)
      expect(vi.mocked(listUsers).mock.calls[0]?.[0].role).toBe('tutor')
    })

    it('toasts when the tutor list cannot load', async () => {
      signInAs('coordinator')
      const failure = new Error('down')
      vi.mocked(listUsers).mockRejectedValue(failure)
      const { hook } = await renderLoaded()

      await waitFor(() => expect(hook.result.current.tutorsLoading).toBe(false))
      expect(toastApiError).toHaveBeenCalledWith(failure, "Couldn't load the tutor list")
    })

    it('lets the owning client edit, pay, and delete but not manage staff lists', async () => {
      signInAs('client', 'client-1')
      const { hook } = await renderLoaded('/client/tasks/task-1')

      expect(hook.result.current).toMatchObject({
        canAssignTutors: false,
        canViewPayments: true,
        canEditFields: true,
        canViewRevisions: false,
        canCreateRevisions: false,
        canUploadDocs: true,
        canUploadSolutions: false,
        canDelete: true,
      })
      expect(listUsers).not.toHaveBeenCalled()
      expect(listRevisionsForTask).not.toHaveBeenCalled()
    })

    it('does not let another client delete the task', async () => {
      signInAs('client', 'client-2')
      const { hook } = await renderLoaded('/client/tasks/task-1')

      expect(hook.result.current.canDelete).toBe(false)
    })

    it.each([
      ['in-progress', 'tutor-1'],
      ['pending', 'tutor-1'],
      ['cancelled', null],
    ] as const)(
      'does not let the owning client delete a %s task (tutor %s)',
      async (status, tutorId) => {
        signInAs('client', 'client-1')
        vi.mocked(getTask).mockResolvedValue(makeTask({ status, tutorId }))
        const { hook } = await renderLoaded('/client/tasks/task-1')

        expect(hook.result.current.canDelete).toBe(false)
      },
    )

    it.each([
      ['in-progress', 'tutor-1', { canSubmit: true, canCancelSubmit: false }],
      ['waiting_coordinator_approval', 'tutor-1', { canSubmit: false, canCancelSubmit: true }],
      ['in-progress', 'tutor-2', { canSubmit: false, canCancelSubmit: false }],
    ] as const)(
      'gives a tutor submit controls for status %s when assigned to %s',
      async (status, tutorId, expected) => {
        signInAs('tutor', 'tutor-1')
        vi.mocked(getTask).mockResolvedValue(makeTask({ status, tutorId }))
        const { hook } = await renderLoaded('/tutor/tasks/task-1')

        expect(hook.result.current).toMatchObject({
          ...expected,
          canViewPayments: false,
          canViewPaymentSummary: false,
          canViewRevisions: true,
          canUploadSolutions: tutorId === 'tutor-1',
          canEditFields: false,
          canDelete: false,
        })
      },
    )

    it('shows the approve action to staff only while awaiting approval', async () => {
      vi.mocked(getTask).mockResolvedValue(makeTask({ status: 'waiting_coordinator_approval' }))
      const { hook } = await renderLoaded()

      expect(hook.result.current.canApprove).toBe(true)
    })
  })

  describe('price', () => {
    it('rejects an invalid price without calling the API', async () => {
      const { hook } = await renderLoaded()

      act(() => hook.result.current.setPriceValue('-1'))
      await act(() => hook.result.current.onSavePrice(formEvent()))

      expect(toastInvalid).toHaveBeenCalledWith(
        'Invalid price',
        'Enter a number of 0 or more, e.g. 49.99.',
      )
      expect(updateTaskPrice).not.toHaveBeenCalled()
    })

    it('saves the price, merges the task, and closes the dialog', async () => {
      vi.mocked(updateTaskPrice).mockResolvedValue(taskRow({ price: 49.99 }))
      const { hook } = await renderLoaded()

      act(() => {
        hook.result.current.setPriceOpen(true)
        hook.result.current.setPriceValue('49.99')
      })
      await act(() => hook.result.current.onSavePrice(formEvent()))

      expect(updateTaskPrice).toHaveBeenCalledWith('task-1', 49.99)
      expect(toastSuccess).toHaveBeenCalledWith('Price updated', '$0.00 → $49.99.')
      expect(hook.result.current.task?.price).toBe(49.99)
      expect(hook.result.current.priceOpen).toBe(false)
      expect(hook.result.current.isActing).toBe(false)
    })

    it('keeps the dialog open and toasts when saving fails', async () => {
      const failure = new Error('forbidden')
      vi.mocked(updateTaskPrice).mockRejectedValue(failure)
      const { hook } = await renderLoaded()

      act(() => {
        hook.result.current.setPriceOpen(true)
        hook.result.current.setPriceValue('10')
      })
      await act(() => hook.result.current.onSavePrice(formEvent()))

      expect(toastApiError).toHaveBeenCalledWith(failure, "Couldn't update the price")
      expect(hook.result.current.priceOpen).toBe(true)
      expect(hook.result.current.task?.price).toBe(0)
      expect(hook.result.current.isActing).toBe(false)
    })
  })

  describe('task actions', () => {
    it('mentions the new status when an action changes it', async () => {
      vi.mocked(getTask).mockResolvedValue(
        makeTask({ status: 'waiting_coordinator_approval', files: [taskFile('f1', 'brief.pdf')] }),
      )
      vi.mocked(approveTask).mockResolvedValue(taskRow({ status: 'completed' }))
      const { hook } = await renderLoaded()

      let ok = false
      await act(async () => {
        ok = await hook.result.current.runTaskAction(
          { success: 'Task approved', failure: "Couldn't approve the task" },
          () => hook.result.current.approveTask('task-1'),
        )
      })

      expect(ok).toBe(true)
      expect(toastSuccess).toHaveBeenCalledWith('Task approved', 'Status is now “Completed”.')
      expect(hook.result.current.task?.status).toBe('completed')
      expect(hook.result.current.task?.files).toHaveLength(1)
    })

    it('removes a document from the list after deleting it', async () => {
      vi.mocked(getTask).mockResolvedValue(
        makeTask({ files: [taskFile('f1', 'brief.pdf'), taskFile('f2', 'notes.pdf')] }),
      )
      vi.mocked(deleteTaskFile).mockResolvedValue(undefined)
      const { hook } = await renderLoaded()

      act(() => hook.result.current.onRemoveFile('f1'))

      await waitFor(() => expect(hook.result.current.task?.files.map((f) => f.id)).toEqual(['f2']))
      expect(deleteTaskFile).toHaveBeenCalledWith('task-1', 'f1')
      expect(toastSuccess).toHaveBeenCalledWith('Document removed', 'brief.pdf')
    })

    it('asks before deleting and returns to the task list', async () => {
      const confirm = vi
        .spyOn(window, 'confirm')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
      vi.mocked(deleteTask).mockResolvedValue(undefined)
      const { hook, location } = await renderLoaded()

      await act(() => hook.result.current.onDeleteTask())
      expect(deleteTask).not.toHaveBeenCalled()

      await act(() => hook.result.current.onDeleteTask())
      expect(deleteTask).toHaveBeenCalledWith('task-1')
      expect(toastSuccess).toHaveBeenCalledWith('Task deleted', '“Essay on Turing” was removed.')
      expect(location.current).toBe('/admin/tasks')
      confirm.mockRestore()
    })
  })

  describe('uploads', () => {
    function fileOf(name: string, size: number) {
      const file = new File(['x'], name, { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: size })
      return file
    }

    it('rejects a file over 25 MB before uploading anything', async () => {
      const { hook } = await renderLoaded()

      await act(() =>
        hook.result.current.onUpload('documents', [
          fileOf('ok.pdf', 1000),
          fileOf('huge.pdf', 26 * 1024 * 1024),
        ]),
      )

      expect(toastInvalid).toHaveBeenCalledWith(
        'File too large',
        '“huge.pdf” is 26.0 MB. The limit is 25 MB.',
      )
      expect(uploadTaskFile).not.toHaveBeenCalled()
    })

    it('uploads files in order and appends them', async () => {
      vi.mocked(uploadTaskFile).mockImplementation(async (_taskId, file) =>
        taskFile(`new-${file.name}`, file.name),
      )
      const { hook } = await renderLoaded()

      await act(() =>
        hook.result.current.onUpload('documents', [fileOf('a.pdf', 300), fileOf('b.pdf', 100)]),
      )

      expect(vi.mocked(uploadTaskFile).mock.calls.map((call) => call[1].name)).toEqual([
        'a.pdf',
        'b.pdf',
      ])
      expect(hook.result.current.task?.files.map((f) => f.originalName)).toEqual(['a.pdf', 'b.pdf'])
      expect(toastSuccess).toHaveBeenCalledWith('2 files uploaded', 'Added to Documents.')
      expect(hook.result.current.uploadProgress).toBeNull()
      expect(hook.result.current.uploadTarget).toBeNull()
      expect(hook.result.current.isActing).toBe(false)
    })

    it('tracks combined progress across files while uploading', async () => {
      let release!: () => void
      vi.mocked(uploadTaskFile).mockImplementation(async (_taskId, file, onProgress) => {
        onProgress?.(file.size / 2)
        if (file.name === 'b.pdf') await new Promise<void>((r) => (release = r))
        return taskFile(`new-${file.name}`, file.name)
      })
      const { hook } = await renderLoaded()

      let pending!: Promise<void>
      act(() => {
        pending = hook.result.current.onUpload('documents', [
          fileOf('a.pdf', 300),
          fileOf('b.pdf', 100),
        ])
      })
      await waitFor(() => expect(hook.result.current.uploadProgress?.percent).toBe(88))
      expect(hook.result.current.uploadProgress).toEqual({
        fileName: 'b.pdf',
        fileIndex: 2,
        fileCount: 2,
        percent: 88,
      })
      expect(hook.result.current.uploadTarget).toBe('documents')
      expect(hook.result.current.isActing).toBe(true)

      await act(async () => {
        release()
        await pending
      })

      expect(hook.result.current.uploadProgress).toBeNull()
      expect(hook.result.current.uploadTarget).toBeNull()
    })

    it('reports a partial batch when a later file fails', async () => {
      const failure = new Error('quota')
      vi.mocked(uploadTaskFile)
        .mockResolvedValueOnce(taskFile('new-a', 'a.pdf'))
        .mockRejectedValueOnce(failure)
      const { hook } = await renderLoaded()

      await act(() =>
        hook.result.current.onUpload('documents', [
          fileOf('a.pdf', 10),
          fileOf('b.pdf', 10),
          fileOf('c.pdf', 10),
        ]),
      )

      expect(uploadTaskFile).toHaveBeenCalledTimes(2)
      expect(toastApiError).toHaveBeenCalledWith(failure, "Couldn't upload “b.pdf”")
      expect(toast.info).toHaveBeenCalledWith('1 of 3 files were uploaded before the error.')
      expect(hook.result.current.task?.files.map((f) => f.originalName)).toEqual(['a.pdf'])
      expect(hook.result.current.isActing).toBe(false)
    })
  })
})
