import type { AuthActor } from '../../authz/index.js'
import { hasPermission, isClient, isTutor } from '../../authz/index.js'
import { conflict, forbidden, notFound } from '../../errors/app-error.js'
import { type ListResult, toListResult } from '../_shared/list-result.js'
import type { Task } from '../tasks/tasks.types.js'
import type { FeedbackRepository } from './feedback.repository.js'
import type { CreateFeedbackBody, ListFeedbackQuery } from './feedback.schema.js'
import type { FeedbackRecord } from './feedback.types.js'

export type FeedbackListResult = ListResult<FeedbackRecord>

export type FeedbackService = {
  createFeedback: (input: CreateFeedbackBody, actor: AuthActor) => Promise<FeedbackRecord>
  listFeedback: (query: ListFeedbackQuery, actor: AuthActor) => Promise<FeedbackListResult>
  deleteFeedback: (id: string, actor: AuthActor) => Promise<void>
}

export type FeedbackServiceDeps = {
  findTask: (taskId: string) => Promise<Pick<Task, 'clientId' | 'tutorId' | 'status'> | null>
}

export function createFeedbackService(
  repository: FeedbackRepository,
  deps: FeedbackServiceDeps,
): FeedbackService {
  return {
    async createFeedback(input, actor) {
      if (!hasPermission(actor, 'submit_feedback') || !isClient(actor.roles)) {
        throw forbidden('Only clients can submit feedback')
      }

      const task = await deps.findTask(input.taskId)
      if (!task) {
        throw notFound('Task not found', 'TASK_NOT_FOUND')
      }
      if (task.clientId !== actor.id) {
        throw forbidden('You can only leave feedback on your own tasks')
      }
      if (task.status !== 'completed' || !task.tutorId) {
        throw conflict('Feedback opens once the task is completed')
      }
      if (await repository.existsForTaskAndClient(input.taskId, actor.id)) {
        throw conflict('You already left feedback for this task')
      }

      return repository.create({
        taskId: input.taskId,
        tutorId: task.tutorId,
        clientId: actor.id,
        rating: input.rating,
        comments: input.comments,
        suggestions: input.suggestions,
      })
    },

    /** Clients see their own, tutors what they received, other viewers everything. */
    async listFeedback(query, actor) {
      if (!hasPermission(actor, 'view_feedback')) {
        throw forbidden()
      }
      const filter: Parameters<FeedbackRepository['findPage']>[0] = {
        page: query.page,
        limit: query.limit,
        search: query.search,
      }

      if (isTutor(actor.roles)) {
        filter.tutorId = actor.id
      } else if (isClient(actor.roles)) {
        filter.clientId = actor.id
      }

      const page = await repository.findPage(filter)
      return toListResult(page.items, page.total, query)
    },

    async deleteFeedback(id, actor) {
      if (!hasPermission(actor, 'delete_feedback')) {
        throw forbidden()
      }
      const deleted = await repository.deleteById(id)
      if (!deleted) {
        throw notFound('Feedback not found')
      }
    },
  }
}
