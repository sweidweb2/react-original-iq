import { getLogger } from '../../logging/index.js'
import { toListResult } from '../_shared/list-result.js'
import type {
  ActivityLogStats,
  CreateActivityInput,
  CreateErrorInput,
  LoggingRepository,
} from './logging.repository.js'
import type { ListActivityQuery, ListErrorsQuery } from './logging.schema.js'
import type { ActivityLogDto, ErrorLogDto, ErrorLogStats, PaginatedLogs } from './logging.types.js'

const MAX_STACK_LENGTH = 4000
const MAX_MESSAGE_LENGTH = 2000

export type LoggingService = {
  recordActivity: (input: CreateActivityInput) => Promise<void>
  recordError: (input: CreateErrorInput) => Promise<void>
  /** Fire-and-forget; never throws to callers. */
  recordActivitySafe: (input: CreateActivityInput) => void
  /** Fire-and-forget; write failures go to stdout only (never back into `error_logs`). */
  recordErrorSafe: (input: CreateErrorInput) => void
  listActivity: (query: ListActivityQuery) => Promise<PaginatedLogs<ActivityLogDto>>
  getActivityStats: () => Promise<ActivityLogStats>
  listErrors: (query: ListErrorsQuery) => Promise<PaginatedLogs<ErrorLogDto>>
  getErrorStats: () => Promise<ErrorLogStats>
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function normalizeError(input: CreateErrorInput): CreateErrorInput {
  return {
    ...input,
    message: truncate(input.message, MAX_MESSAGE_LENGTH),
    stack: input.stack ? truncate(input.stack, MAX_STACK_LENGTH) : (input.stack ?? null),
  }
}

export type LoggingServiceOptions = {
  /** Defaults to stdout only; the module wires this to `reportError`. */
  onActivityWriteFailure?: (error: unknown, input: CreateActivityInput) => void
}

export function createLoggingService(
  repository: LoggingRepository,
  options: LoggingServiceOptions = {},
): LoggingService {
  return {
    async recordActivity(input) {
      await repository.createActivity(input)
    },

    async recordError(input) {
      await repository.createError(normalizeError(input))
    },

    recordActivitySafe(input) {
      void repository.createActivity(input).catch((error: unknown) => {
        if (options.onActivityWriteFailure) {
          options.onActivityWriteFailure(error, input)
          return
        }
        getLogger().error({ err: error }, 'failed to write activity')
      })
    },

    recordErrorSafe(input) {
      void repository.createError(normalizeError(input)).catch((error: unknown) => {
        getLogger().error({ err: error }, 'failed to write error log')
      })
    },

    async listActivity(query) {
      const { items, total } = await repository.listActivity({
        page: query.page,
        limit: query.limit,
        search: query.search,
        actionPrefix: query.actionPrefix,
        entity: query.entity,
        since: query.since,
      })
      return toListResult(
        items.map((row) => ({
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
        total,
        query,
      )
    },

    getActivityStats() {
      return repository.countActivityStats()
    },

    async listErrors(query) {
      const { items, total } = await repository.listErrors({
        page: query.page,
        limit: query.limit,
        search: query.search,
        source: query.source,
        level: query.level,
        since: query.since,
      })
      return toListResult(
        items.map((row) => ({
          id: row.id,
          source: row.source,
          level: row.level,
          requestId: row.requestId,
          userId: row.userId,
          code: row.code,
          message: row.message,
          stack: row.stack,
          path: row.path,
          method: row.method,
          status: row.status,
          meta: row.meta,
          createdAt: row.createdAt.toISOString(),
          user: row.user
            ? {
                id: row.user.id,
                email: row.user.email,
                role: row.user.role,
              }
            : null,
        })),
        total,
        query,
      )
    },

    getErrorStats() {
      return repository.countErrorStats()
    },
  }
}
