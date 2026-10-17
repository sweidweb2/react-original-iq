import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import { validationError } from '../../src/errors/app-error.js'
import type { TasksRepository } from '../../src/modules/tasks/tasks.repository.js'
import { createTaskBodySchema, updateTaskBodySchema } from '../../src/modules/tasks/tasks.schema.js'
import { createTasksService } from '../../src/modules/tasks/tasks.service.js'
import type { Task, TaskDetail } from '../../src/modules/tasks/tasks.types.js'
import type { UsersRepository } from '../../src/modules/users/users.repository.js'
import type { UsersService } from '../../src/modules/users/users.service.js'
import type { AccountRecord } from '../../src/modules/users/users.types.js'
import type { StorageService } from '../../src/storage/index.js'

vi.mock('../../src/modules/logging/index.js', () => ({
  getLoggingService: () => ({
    recordActivitySafe: vi.fn(),
    recordErrorSafe: vi.fn(),
  }),
}))

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    clientId: 'client-1',
    tutorId: null,
    coordinatorId: 'coord-1',
    topic: 'Essay help',
    type: 'assignment',
    description: 'Need help',
    isAssigned: false,
    status: 'pending',
    deadline: '2030-01-01T12:00:00.000Z',
    price: 0,
    paymentStatus: 'unpaid',
    category: 'Writing',
    feedback: null,
    allowView: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeDetail(overrides: Partial<Task> = {}): TaskDetail {
  return { ...makeTask(overrides), files: [], solutions: [] }
}

function makeAccount(overrides: Partial<AccountRecord> = {}): AccountRecord {
  return {
    id: 'client-1',
    email: 'client@example.com',
    passwordHash: 'hash',
    role: 'client',
    status: 'ACTIVE',
    phone: null,
    profile: { firstName: 'C', lastName: 'Lient', displayName: 'Client' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const admin: AuthActor = { id: 'admin-1', roles: ['admin'] }
const coordinator: AuthActor = { id: 'coord-1', roles: ['coordinator'] }
const tutor: AuthActor = { id: 'tutor-1', roles: ['tutor'] }
const client: AuthActor = { id: 'client-1', roles: ['client'] }
const otherClient: AuthActor = { id: 'client-2', roles: ['client'] }

const createBody = {
  topic: 'Essay help',
  type: 'assignment' as const,
  category: 'Writing',
  description: 'Need help',
  deadline: '2030-01-01T12:00:00.000Z',
}

describe('tasks.service', () => {
  let repository: TasksRepository
  let users: UsersService
  let usersRepository: UsersRepository

  beforeEach(() => {
    repository = {
      findPage: vi.fn(),
      countStats: vi.fn(),
      findById: vi.fn(),
      findDetailById: vi.fn(),
      countActiveByCoordinator: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      addFile: vi.fn(),
      listFiles: vi.fn(),
      deleteFile: vi.fn(),
      addSolution: vi.fn(),
      listSolutions: vi.fn(),
      deleteSolution: vi.fn(),
      hasPayments: vi.fn().mockResolvedValue(false),
      countActiveInvolvingUser: vi.fn().mockResolvedValue(0),
      listTaskIdsForClient: vi.fn().mockResolvedValue([]),
    }
    users = {
      findById: vi.fn(),
    } as unknown as UsersService
    usersRepository = {
      findMany: vi
        .fn()
        .mockResolvedValue([
          makeAccount({ id: 'coord-1', role: 'coordinator', email: 'c@example.com' }),
        ]),
      incrementNbDone: vi.fn(),
    } as unknown as UsersRepository
  })

  it('lets a client create a pending unpaid task with auto-assigned coordinator', async () => {
    vi.mocked(users.findById).mockResolvedValue(makeAccount())
    const created = makeTask()
    vi.mocked(repository.create).mockResolvedValue(created)
    const service = createTasksService(repository, users, usersRepository)

    await expect(service.createTask(createBody, client)).resolves.toEqual(created)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        tutorId: null,
        coordinatorId: 'coord-1',
        price: 0,
        status: 'pending',
      }),
    )
  })

  it('scopes tutor list to assigned tasks only', async () => {
    vi.mocked(repository.findPage).mockResolvedValue({ items: [], total: 0 })
    const service = createTasksService(repository, users, usersRepository)

    await service.listTasks({ page: 1, limit: 20 }, tutor)
    expect(repository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: { kind: 'tutor', tutorId: 'tutor-1' },
      }),
    )
  })

  it('blocks a client from reading another client task', async () => {
    vi.mocked(repository.findDetailById).mockResolvedValue(makeDetail())
    const service = createTasksService(repository, users, usersRepository)

    await expect(service.getTaskById(makeTask().id, otherClient)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('assigns a tutor and moves pending → in-progress', async () => {
    const pending = makeTask({ status: 'pending' })
    vi.mocked(repository.findById).mockResolvedValue(pending)
    vi.mocked(users.findById).mockResolvedValue(
      makeAccount({ id: 'tutor-1', role: 'tutor', email: 't@example.com' }),
    )
    const updated = makeTask({ tutorId: 'tutor-1', status: 'in-progress', isAssigned: true })
    vi.mocked(repository.update).mockResolvedValue(updated)
    const service = createTasksService(repository, users, usersRepository)

    await expect(service.assignTutor(pending.id, 'tutor-1', coordinator)).resolves.toEqual(updated)
    expect(repository.update).toHaveBeenCalledWith(pending.id, {
      tutorId: 'tutor-1',
      status: 'in-progress',
    })
  })

  it('lets assigned tutor submit and coordinator approve with nb_done increment', async () => {
    const inProgress = makeTask({
      status: 'in-progress',
      tutorId: 'tutor-1',
      isAssigned: true,
    })
    const waiting = makeTask({
      status: 'waiting_coordinator_approval',
      tutorId: 'tutor-1',
      isAssigned: true,
    })
    const completed = makeTask({
      status: 'completed',
      tutorId: 'tutor-1',
      isAssigned: true,
    })

    vi.mocked(repository.findById).mockResolvedValueOnce(inProgress).mockResolvedValueOnce(waiting)
    vi.mocked(repository.update).mockResolvedValueOnce(waiting).mockResolvedValueOnce(completed)

    const service = createTasksService(repository, users, usersRepository)

    await expect(service.submitTask(inProgress.id, tutor)).resolves.toEqual(waiting)
    await expect(service.approveTask(waiting.id, coordinator)).resolves.toEqual(completed)
    expect(usersRepository.incrementNbDone).toHaveBeenCalledWith('tutor-1')
  })

  it('rejects approve when tutor is missing', async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({ status: 'waiting_coordinator_approval', tutorId: null }),
    )
    const service = createTasksService(repository, users, usersRepository)

    await expect(service.approveTask(makeTask().id, coordinator)).rejects.toMatchObject({
      status: 400,
    })
  })

  it('blocks approve when an open revision exists', async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({ status: 'waiting_coordinator_approval', tutorId: 'tutor-1' }),
    )
    const hasOpenRevision = vi.fn().mockResolvedValue(true)
    const service = createTasksService(repository, users, usersRepository, { hasOpenRevision })

    await expect(service.approveTask(makeTask().id, coordinator)).rejects.toMatchObject({
      status: 400,
    })
    expect(hasOpenRevision).toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it.each([
    { status: 'completed' },
    { price: 100 },
    { tutorId: '7c9e6679-7425-40de-944b-e07fc1f90ae7' },
    { paymentStatus: 'paid' },
  ])('rejects lifecycle field %o on PATCH so dedicated endpoints stay the only path', (body) => {
    expect(updateTaskBodySchema.safeParse(body).success).toBe(false)
    expect(updateTaskBodySchema.safeParse({ topic: 'New topic', ...body }).success).toBe(false)
  })

  it('lets staff edit content fields', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeTask())
    vi.mocked(repository.update).mockResolvedValue(makeTask({ topic: 'New topic' }))
    const service = createTasksService(repository, users, usersRepository)
    const body = updateTaskBodySchema.parse({ topic: 'New topic', category: 'Math' })

    await expect(service.updateTask(makeTask().id, body, coordinator)).resolves.toMatchObject({
      topic: 'New topic',
    })
    expect(repository.update).toHaveBeenCalledWith(makeTask().id, {
      topic: 'New topic',
      category: 'Math',
    })
  })

  it('ignores a requested status on create; staff with a tutor start in-progress', async () => {
    vi.mocked(repository.create).mockResolvedValue(makeTask())
    const service = createTasksService(repository, users, usersRepository)
    const body = createTaskBodySchema.parse({
      ...createBody,
      clientId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      tutorId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      status: 'completed',
    })
    vi.mocked(users.findById).mockImplementation(async (id) =>
      id === body.tutorId
        ? makeAccount({ id, role: 'tutor', email: 't@example.com' })
        : makeAccount({ id }),
    )

    await service.createTask(body, admin)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in-progress', tutorId: body.tutorId }),
    )
  })

  it('rejects client approve', async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({ status: 'waiting_coordinator_approval', tutorId: 'tutor-1' }),
    )
    const service = createTasksService(repository, users, usersRepository)

    await expect(service.approveTask(makeTask().id, client)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('removes tutor and returns in-progress → pending', async () => {
    const task = makeTask({ status: 'in-progress', tutorId: 'tutor-1', isAssigned: true })
    vi.mocked(repository.findById).mockResolvedValue(task)
    const updated = makeTask({ status: 'pending', tutorId: null })
    vi.mocked(repository.update).mockResolvedValue(updated)
    const service = createTasksService(repository, users, usersRepository)

    await expect(service.removeTutor(task.id, coordinator)).resolves.toEqual(updated)
    expect(repository.update).toHaveBeenCalledWith(task.id, {
      tutorId: null,
      status: 'pending',
    })
  })

  it('activates cancelled task to pending or in-progress based on tutor', async () => {
    const cancelled = makeTask({ status: 'cancelled', tutorId: null })
    vi.mocked(repository.findById).mockResolvedValue(cancelled)
    const pending = makeTask({ status: 'pending' })
    vi.mocked(repository.update).mockResolvedValue(pending)
    const service = createTasksService(repository, users, usersRepository)

    await expect(service.activateTask(cancelled.id, admin)).resolves.toEqual(pending)
    expect(repository.update).toHaveBeenCalledWith(cancelled.id, { status: 'pending' })
  })

  it('blocks delete when payments or refunds exist', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeTask())
    vi.mocked(repository.hasPayments).mockResolvedValue(true)
    const service = createTasksService(repository, users, usersRepository)

    await expect(service.deleteTask(makeTask().id, client)).rejects.toMatchObject({
      status: 409,
    })
  })

  it('sets payment_status unpaid on price edit when no money rows', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeTask())
    vi.mocked(repository.hasPayments).mockResolvedValue(false)
    const priced = makeTask({ price: 50, paymentStatus: 'unpaid' })
    vi.mocked(repository.update).mockResolvedValue(priced)
    const service = createTasksService(repository, users, usersRepository)

    await service.updatePrice(makeTask().id, 50, coordinator)
    expect(repository.update).toHaveBeenCalledWith(makeTask().id, { price: 50 })
    expect(repository.update).toHaveBeenCalledWith(makeTask().id, { paymentStatus: 'unpaid' })
  })

  it('hides solutions from client when allow_view is false', async () => {
    vi.mocked(repository.findDetailById).mockResolvedValue({
      ...makeDetail({ allowView: false }),
      solutions: [
        {
          id: 'sol-1',
          taskId: makeTask().id,
          fileLocation: 'https://files.example/sol.pdf',
          originalName: null,
          contentType: null,
          sizeBytes: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    const service = createTasksService(repository, users, usersRepository)

    const detail = await service.getTaskById(makeTask().id, client)
    expect(detail.solutions).toEqual([])
  })

  describe('file uploads', () => {
    const taskId = makeTask().id
    let storage: StorageService

    beforeEach(() => {
      storage = {
        isConfigured: () => true,
        getSignedUploadUrl: vi.fn(async (input: { taskId: string; originalFilename: string }) => ({
          url: 'https://storage.example/put',
          key: `student_files/${input.taskId}/abc_${input.originalFilename}`,
          contentType: 'application/pdf',
          sizeBytes: 10,
          expiresInSec: 900,
        })),
        getSignedDownloadUrl: vi.fn(async (key: string) => ({
          url: `https://storage.example/get/${key}`,
          expiresInSec: 900,
          key,
        })),
        validateStoredObject: vi.fn(async (input: { originalFilename: string }) => ({
          extension: 'pdf',
          contentType: 'application/pdf',
          sizeBytes: 2048,
          originalFilename: input.originalFilename,
        })),
        deleteObject: vi.fn(async () => undefined),
      } as unknown as StorageService
      vi.mocked(repository.findById).mockResolvedValue(makeTask())
      vi.mocked(repository.listFiles).mockResolvedValue([])
      vi.mocked(repository.listSolutions).mockResolvedValue([])
    })

    it('issues an upload URL for the owning client', async () => {
      const service = createTasksService(repository, users, usersRepository, { storage })

      const result = await service.createFileUploadUrl(
        taskId,
        { filename: 'brief.pdf', contentType: 'application/pdf', sizeBytes: 10 },
        client,
      )
      expect(result.uploadUrl).toBe('https://storage.example/put')
      expect(storage.getSignedUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'documents', taskId, taskBytesUsed: 0 }),
      )
    })

    it('blocks tutors from uploading client documents', async () => {
      vi.mocked(repository.findById).mockResolvedValue(makeTask({ tutorId: 'tutor-1' }))
      const service = createTasksService(repository, users, usersRepository, { storage })

      await expect(
        service.createFileUploadUrl(
          taskId,
          { filename: 'brief.pdf', contentType: 'application/pdf', sizeBytes: 10 },
          tutor,
        ),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('registers an uploaded document using metadata from storage', async () => {
      const service = createTasksService(repository, users, usersRepository, { storage })
      const key = `student_files/${taskId}/abc_brief.pdf`

      await service.addFile(taskId, { key, filename: 'brief.pdf' }, client)
      expect(repository.addFile).toHaveBeenCalledWith(taskId, {
        fileLocation: key,
        originalName: 'brief.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
        note: undefined,
      })
    })

    it('rejects keys that belong to another task or category', async () => {
      const service = createTasksService(repository, users, usersRepository, { storage })

      await expect(
        service.addFile(
          taskId,
          {
            key: 'student_files/22222222-2222-2222-2222-222222222222/abc_x.pdf',
            filename: 'x.pdf',
          },
          client,
        ),
      ).rejects.toMatchObject({ status: 400 })
      await expect(
        service.addFile(
          taskId,
          { key: `solutions/${taskId}/abc_x.pdf`, filename: 'x.pdf' },
          client,
        ),
      ).rejects.toMatchObject({ status: 400 })
      expect(repository.addFile).not.toHaveBeenCalled()
    })

    it('rejects registration when storage validation fails', async () => {
      vi.mocked(storage.validateStoredObject).mockRejectedValue(
        validationError('Uploaded file was not found in storage'),
      )
      const service = createTasksService(repository, users, usersRepository, { storage })

      await expect(
        service.addFile(
          taskId,
          { key: `student_files/${taskId}/abc_x.pdf`, filename: 'x.pdf' },
          client,
        ),
      ).rejects.toMatchObject({ status: 400 })
      expect(repository.addFile).not.toHaveBeenCalled()
    })

    it('validates against the signed key name and keeps the display name readable', async () => {
      const service = createTasksService(repository, users, usersRepository, { storage })
      const key = `student_files/${taskId}/abc_____.pdf`

      await service.addFile(taskId, { key, filename: 'واجب.pdf' }, client)
      expect(storage.validateStoredObject).toHaveBeenCalledWith({
        key,
        originalFilename: 'abc_____.pdf',
        taskBytesUsed: 0,
      })
      expect(repository.addFile).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({ originalName: 'واجب.pdf' }),
      )
    })

    it('purges the stored object when a document is deleted', async () => {
      const key = `student_files/${taskId}/abc_brief.pdf`
      vi.mocked(repository.deleteFile).mockResolvedValue({
        id: 'file-1',
        taskId,
        fileLocation: key,
        note: null,
        originalName: 'brief.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      const service = createTasksService(repository, users, usersRepository, { storage })

      await service.deleteFile(taskId, 'file-1', client)
      expect(storage.deleteObject).toHaveBeenCalledWith(key)
    })

    it('signs download URLs for stored solutions only when visible', async () => {
      const key = `solutions/${taskId}/abc_answer.pdf`
      const solution = {
        id: 'sol-1',
        taskId,
        fileLocation: key,
        originalName: 'answer.pdf',
        contentType: 'application/pdf',
        sizeBytes: 100,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const service = createTasksService(repository, users, usersRepository, { storage })

      vi.mocked(repository.findDetailById).mockResolvedValue({
        ...makeDetail({ allowView: true }),
        solutions: [solution],
      })
      await expect(service.getSolutionDownloadUrl(taskId, 'sol-1', client)).resolves.toEqual({
        url: `https://storage.example/get/${key}`,
        filename: 'answer.pdf',
        expiresInSec: 900,
      })

      vi.mocked(repository.findDetailById).mockResolvedValue({
        ...makeDetail({ allowView: false }),
        solutions: [solution],
      })
      await expect(service.getSolutionDownloadUrl(taskId, 'sol-1', client)).rejects.toMatchObject({
        status: 404,
      })
    })
  })
})
