import { getLogger } from '../../logging/index.js'
import type { PaginationQuery } from '../_shared/pagination.schema.js'
import type {
  CreateActivityInput,
  CreateErrorInput,
  LoggingRepository,
} from './logging.repository.js'
import type { ActivityLogDto, ErrorLogDto, PaginatedLogs } from './logging.types.js'

const MAX_STACK_LENGTH = 4000

export type LoggingService = {
  recordActivity: (input: CreateActivityInput) => Promise<void>
  recordError: (input: CreateErrorInput) => Promise<void>
  /** Fire-and-forget; never throws to callers. */
  recordActivitySafe: (input: CreateActivityInput) => void
  recordErrorSafe: (input: CreateErrorInput) => void
  listActivity: (query: PaginationQuery) => Promise<PaginatedLogs<ActivityLogDto>>
  listErrors: (query: PaginationQuery) => Promise<PaginatedLogs<ErrorLogDto>>
}

export function createLoggingService(repository: LoggingRepository): LoggingService {
  return {
    async recordActivity(input) {
      await repository.createActivity(input)
    },

    async recordError(input) {
      const stack =
        input.stack && input.stack.length > MAX_STACK_LENGTH
          ? `${input.stack.slice(0, MAX_STACK_LENGTH)}…`
          : input.stack
      await repository.createError({ ...input, stack: stack ?? null })
    },

    recordActivitySafe(input) {
      void repository.createActivity(input).catch((error) => {
        getLogger().error({ err: error }, 'failed to write activity')
      })
    },

    recordErrorSafe(input) {
      const stack =
        input.stack && input.stack.length > MAX_STACK_LENGTH
          ? `${input.stack.slice(0, MAX_STACK_LENGTH)}…`
          : input.stack
      void repository.createError({ ...input, stack: stack ?? null }).catch((error) => {
        getLogger().error({ err: error }, 'failed to write error log')
      })
    },

    async listActivity(query) {
      const { items, total } = await repository.listActivity(query.page, query.limit)
      return {
        data: items.map((row) => ({
          id: row.id,
          userId: row.userId,
          action: row.action,
          entity: row.entity,
          entityId: row.entityId,
          meta: row.meta,
          ip: row.ip,
          requestId: row.requestId,
          createdAt: row.createdAt.toISOString(),
          user: row.user
            ? {
                id: row.user.id,
                email: row.user.email,
                role: row.user.role,
              }
            : null,
        })),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
        },
      }
    },

    async listErrors(query) {
      const { items, total } = await repository.listErrors(query.page, query.limit)
      return {
        data: items.map((row) => ({
          id: row.id,
          requestId: row.requestId,
          userId: row.userId,
          code: row.code,
          message: row.message,
          stack: row.stack,
          path: row.path,
          method: row.method,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        })),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
        },
      }
    },
  }
}
