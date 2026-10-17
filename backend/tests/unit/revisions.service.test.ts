import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import type { RevisionsRepository } from '../../src/modules/revisions/revisions.repository.js'
import { createRevisionsService } from '../../src/modules/revisions/revisions.service.js'
import type { RevisionDetail } from '../../src/modules/revisions/revisions.types.js'
import type { TasksRepository } from '../../src/modules/tasks/tasks.repository.js'
import type { Task, TaskSolution } from '../../src/modules/tasks/tasks.types.js'

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
