import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import {
  createRevisionsRepository,
  resetRevisionsRepositoryForTests,
  type RevisionsRepository,
} from '../../src/modules/revisions/revisions.repository.js'
import {
  createRevisionsService,
  type RevisionsService,
} from '../../src/modules/revisions/revisions.service.js'
import type { RevisionDetail } from '../../src/modules/revisions/revisions.types.js'
import type { TasksRepository } from '../../src/modules/tasks/tasks.repository.js'
import type { Task, TaskSolution } from '../../src/modules/tasks/tasks.types.js'
import { loadTestConfig } from '../helpers/test-config.js'

const TASK_ID = '11111111-1111-1111-1111-111111111111'
const REVISION_ID = '22222222-2222-2222-2222-222222222222'
const OWN_SOLUTION = '33333333-3333-3333-3333-333333333333'
const FOREIGN_SOLUTION = '44444444-4444-4444-4444-444444444444'

const tutor: AuthActor = { id: 'tutor-1', roles: ['tutor'] }

function makeRevision(overrides: Partial<RevisionDetail> = {}): RevisionDetail {
  return {
    id: REVISION_ID,
    taskId: TASK_ID,
    status: 'in-revision',
    solutions: [],
    ...overrides,
  } as RevisionDetail
}

describe('revisions.service tutorSubmit', () => {
  let repository: RevisionsRepository
  let tasksRepository: TasksRepository

  beforeEach(() => {
    repository = {
      findById: vi.fn(async () => makeRevision()),
      setStatus: vi.fn(async () => makeRevision({ status: 'waiting_coordinator_approval' })),
      linkSolutions: vi.fn(async () => []),
    } as unknown as RevisionsRepository
    tasksRepository = {
      findById: vi.fn(async () => ({ id: TASK_ID, tutorId: 'tutor-1' }) as Task),
      listSolutions: vi.fn(async () => [{ id: OWN_SOLUTION, taskId: TASK_ID } as TaskSolution]),
    } as unknown as TasksRepository
  })

  it('rejects solutions from another task and changes nothing', async () => {
    const service = createRevisionsService(repository, tasksRepository)

    await expect(
      service.tutorSubmit(REVISION_ID, { solutionIds: [OWN_SOLUTION, FOREIGN_SOLUTION] }, tutor),
    ).rejects.toMatchObject({ status: 403 })
    expect(repository.linkSolutions).not.toHaveBeenCalled()
    expect(repository.setStatus).not.toHaveBeenCalled()
  })

  it('links own solutions before moving the revision to awaiting approval', async () => {
    const service = createRevisionsService(repository, tasksRepository)

    await service.tutorSubmit(REVISION_ID, { solutionIds: [OWN_SOLUTION] }, tutor)

    expect(repository.linkSolutions).toHaveBeenCalledWith(REVISION_ID, [OWN_SOLUTION])
    expect(repository.setStatus).toHaveBeenCalledWith(
      REVISION_ID,
      'waiting_coordinator_approval',
      expect.objectContaining({ submitDate: expect.any(String) }),
    )
    const linkOrder = vi.mocked(repository.linkSolutions).mock.invocationCallOrder[0]!
    const statusOrder = vi.mocked(repository.setStatus).mock.invocationCallOrder[0]!
    expect(linkOrder).toBeLessThan(statusOrder)
  })

  it('rejects a tutor who is not assigned to the task', async () => {
    const service = createRevisionsService(repository, tasksRepository)

    await expect(
      service.tutorSubmit(REVISION_ID, {}, { id: 'tutor-2', roles: ['tutor'] }),
    ).rejects.toMatchObject({ status: 403 })
  })
})

describe('revisions.service lifecycle guards', () => {
  const coordinator: AuthActor = { id: 'coord-1', roles: ['coordinator'] }
  let task: Task
  let service: RevisionsService

  beforeEach(() => {
    resetRevisionsRepositoryForTests()
    task = {
      id: TASK_ID,
      tutorId: 'tutor-1',
      coordinatorId: 'coord-1',
      status: 'completed',
    } as Task
    const tasksRepository = {
      findById: vi.fn(async () => task),
      listSolutions: vi.fn(async () => []),
    } as unknown as TasksRepository
    service = createRevisionsService(createRevisionsRepository(loadTestConfig()), tasksRepository)
  })

  async function completedRevision() {
    const revision = await service.createForTask(TASK_ID, {}, coordinator)
    await service.tutorSubmit(revision.id, {}, tutor)
    return service.approve(revision.id, coordinator)
  }

  it('allows only one open session per task', async () => {
    await service.createForTask(TASK_ID, {}, coordinator)
    await expect(service.createForTask(TASK_ID, {}, coordinator)).rejects.toMatchObject({
      status: 409,
    })
  })

  it('opens a new session once the previous one is closed', async () => {
    const done = await completedRevision()
    expect(done.status).toBe('completed')
    await expect(service.createForTask(TASK_ID, {}, coordinator)).resolves.toMatchObject({
      status: 'in-revision',
    })
  })

  it('rejects revisions on cancelled tasks', async () => {
    task = { ...task, status: 'cancelled' }
    await expect(service.createForTask(TASK_ID, {}, coordinator)).rejects.toMatchObject({
      status: 400,
    })
  })

  it('cannot cancel a completed revision', async () => {
    const done = await completedRevision()
    await expect(service.cancel(done.id, coordinator)).rejects.toMatchObject({ status: 400 })
  })

  it('cannot edit a closed revision', async () => {
    const revision = await service.createForTask(TASK_ID, {}, coordinator)
    await service.cancel(revision.id, coordinator)
    await expect(
      service.update(revision.id, { title: 'Late edit' }, coordinator),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('returns 409 when a concurrent request already moved the revision', async () => {
    const revision = await service.createForTask(TASK_ID, {}, coordinator)
    await service.tutorSubmit(revision.id, {}, tutor)

    const results = await Promise.allSettled([
      service.approve(revision.id, coordinator),
      service.reject(revision.id, coordinator),
    ])

    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((row) => row.status === 'rejected') as PromiseRejectedResult
    expect(rejected.reason).toMatchObject({ status: 409 })
  })
})
