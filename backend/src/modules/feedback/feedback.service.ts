import type { AuthActor } from '../../authz/index.js'
import { hasAnyRole, isAdmin, isSuper } from '../../authz/index.js'
import { forbidden, notFound } from '../../errors/app-error.js'
import type { FeedbackRepository } from './feedback.repository.js'
import type { CreateFeedbackBody, ListFeedbackQuery } from './feedback.schema.js'
import type { FeedbackRecord } from './feedback.types.js'

export type FeedbackListResult = {
  data: FeedbackRecord[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

export type FeedbackService = {
  createFeedback: (input: CreateFeedbackBody, actor: AuthActor) => Promise<FeedbackRecord>
  listFeedback: (query: ListFeedbackQuery, actor: AuthActor) => Promise<FeedbackListResult>
  deleteFeedback: (id: string, actor: AuthActor) => Promise<void>
}

function isPlatformAdmin(roles: readonly string[]): boolean {
  return isSuper(roles) || isAdmin(roles)
}

export function createFeedbackService(repository: FeedbackRepository): FeedbackService {
  return {
    async createFeedback(input, actor) {
      if (!hasAnyRole(actor.roles, ['client'])) {
        throw forbidden('Only clients can submit feedback')
      }

      return repository.create({
        taskId: input.taskId,
        tutorId: input.tutorId,
        clientId: actor.id,
        rating: input.rating,
        comments: input.comments,
        suggestions: input.suggestions,
      })
    },

    async listFeedback(query, actor) {
      const filter: Parameters<FeedbackRepository['findPage']>[0] = {
        page: query.page,
        limit: query.limit,
        search: query.search,
      }

      if (isPlatformAdmin(actor.roles)) {
        // no scope filter
      } else if (hasAnyRole(actor.roles, ['tutor'])) {
        filter.tutorId = actor.id
      } else if (hasAnyRole(actor.roles, ['client'])) {
        filter.clientId = actor.id
      } else {
        throw forbidden()
      }

      const page = await repository.findPage(filter)
      return {
        data: page.items,
        meta: {
          page: query.page,
          limit: query.limit,
          total: page.total,
        },
      }
    },

    async deleteFeedback(id, actor) {
      if (!isPlatformAdmin(actor.roles)) {
        throw forbidden()
      }
      const deleted = await repository.deleteById(id)
      if (!deleted) {
        throw notFound('Feedback not found')
      }
    },
  }
}
