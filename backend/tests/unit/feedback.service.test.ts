import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import {
  createFeedbackRepository,
  type FeedbackRepository,
  resetFeedbackRepositoryForTests,
} from '../../src/modules/feedback/feedback.repository.js'
import { createFeedbackBodySchema } from '../../src/modules/feedback/feedback.schema.js'
import {
  createFeedbackService,
  type FeedbackServiceDeps,
} from '../../src/modules/feedback/feedback.service.js'
import type { Task } from '../../src/modules/tasks/tasks.types.js'
import { loadTestConfig } from '../helpers/test-config.js'

const TASK_ID = '6f1c2a3b-4d5e-4f60-8a71-b2c3d4e5f601'
const client: AuthActor = { id: 'client-1', roles: ['client'] }
const otherClient: AuthActor = { id: 'client-2', roles: ['client'] }

type TaskParties = Pick<Task, 'clientId' | 'tutorId' | 'status'>

describe('feedback.service', () => {
  let repository: FeedbackRepository
  let task: TaskParties | null
  let deps: FeedbackServiceDeps

  beforeEach(() => {
    resetFeedbackRepositoryForTests()
    repository = createFeedbackRepository(loadTestConfig())
    task = { clientId: 'client-1', tutorId: 'tutor-1', status: 'completed' }
    deps = { findTask: vi.fn(async () => task) }
  })

  function submit(actor: AuthActor, body: Record<string, unknown> = {}) {
    const input = createFeedbackBodySchema.parse({ taskId: TASK_ID, rating: 5, ...body })
    return createFeedbackService(repository, deps).createFeedback(input, actor)
  }

  it('stores feedback on the client’s own completed task with the task’s tutor', async () => {
    const created = await submit(client, { tutorId: 'forged-tutor', comments: 'Great' })

    expect(created).toMatchObject({
      taskId: TASK_ID,
      tutorId: 'tutor-1',
      clientId: 'client-1',
      rating: 5,
      comments: 'Great',
    })
  })

  it('rejects another client’s task', async () => {
    await expect(submit(otherClient)).rejects.toMatchObject({ status: 403 })
  })

  it('rejects tasks that are not completed or have no tutor', async () => {
    task = { clientId: 'client-1', tutorId: 'tutor-1', status: 'in-progress' }
    await expect(submit(client)).rejects.toMatchObject({ status: 409 })

    task = { clientId: 'client-1', tutorId: null, status: 'completed' }
    await expect(submit(client)).rejects.toMatchObject({ status: 409 })
  })

  it('returns 404 for a missing task', async () => {
    task = null
    await expect(submit(client)).rejects.toMatchObject({ status: 404, code: 'TASK_NOT_FOUND' })
  })

  it('allows only one feedback per client per task', async () => {
    await submit(client)
    await expect(submit(client, { rating: 4 })).rejects.toMatchObject({ status: 409 })
  })

  it('rejects ratings outside 1–5', () => {
    expect(createFeedbackBodySchema.safeParse({ taskId: TASK_ID, rating: 0 }).success).toBe(false)
    expect(createFeedbackBodySchema.safeParse({ taskId: TASK_ID, rating: 6 }).success).toBe(false)
  })

  it('only clients can submit', async () => {
    await expect(submit({ id: 'tutor-1', roles: ['tutor'] })).rejects.toMatchObject({
      status: 403,
    })
  })
})
