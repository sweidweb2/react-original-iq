import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import type { TasksRepository } from '../../src/modules/tasks/tasks.repository.js'
import { createTasksService } from '../../src/modules/tasks/tasks.service.js'
import type { Task, TaskDetail } from '../../src/modules/tasks/tasks.types.js'
import type { UsersRepository } from '../../src/modules/users/users.repository.js'
import type { UsersService } from '../../src/modules/users/users.service.js'
import type { AccountRecord } from '../../src/modules/users/users.types.js'

vi.mock('../../src/modules/logging/index.js', () => ({
  getLoggingService: () => ({
    recordActivitySafe: vi.fn(),
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
    }
    users = {
      findById: vi.fn(),
    } as unknown as UsersService
    usersRepository = {
      findMany: vi.fn().mockResolvedValue([
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

    vi.mocked(repository.findById)
      .mockResolvedValueOnce(inProgress)
      .mockResolvedValueOnce(waiting)
    vi.mocked(repository.update)
      .mockResolvedValueOnce(waiting)
      .mockResolvedValueOnce(completed)

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

  it('blocks update to completed when an open revision exists', async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({ status: 'in-progress', tutorId: 'tutor-1' }),
    )
    const hasOpenRevision = vi.fn().mockResolvedValue(true)
    const service = createTasksService(repository, users, usersRepository, { hasOpenRevision })

    await expect(
      service.updateTask(makeTask().id, { status: 'completed' }, coordinator),
    ).rejects.toMatchObject({ status: 400 })
    expect(repository.update).not.toHaveBeenCalled()
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
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    const service = createTasksService(repository, users, usersRepository)

    const detail = await service.getTaskById(makeTask().id, client)
    expect(detail.solutions).toEqual([])
  })
})
