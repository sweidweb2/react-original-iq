export type CreateActivityInput = {
  userId?: string | null
  action: string
  entity?: string | null
  entityId?: string | null
  meta?: Record<string, unknown>
  ip?: string | null
  requestId?: string | null
}

export type CreateErrorInput = {
  requestId?: string | null
  userId?: string | null
  code?: string | null
  message: string
  stack?: string | null
  path?: string | null
  method?: string | null
  status?: number | null
}

export type ActivityLogRecord = {
  id: string
  userId: string | null
  action: string
  entity: string | null
  entityId: string | null
  meta: Record<string, unknown> | null
  ip: string | null
  requestId: string | null
  createdAt: Date
  user: { id: string; email: string; role: string } | null
}

export type ErrorLogRecord = {
  id: string
  requestId: string | null
  userId: string | null
  code: string | null
  message: string
  stack: string | null
  path: string | null
  method: string | null
  status: number | null
  createdAt: Date
}

export type LoggingRepository = {
  createActivity: (input: CreateActivityInput) => Promise<void>
  createError: (input: CreateErrorInput) => Promise<void>
  listActivity: (
    page: number,
    limit: number,
  ) => Promise<{
    items: ActivityLogRecord[]
    total: number
  }>
  listErrors: (
    page: number,
    limit: number,
  ) => Promise<{
    items: ErrorLogRecord[]
    total: number
  }>
}

/**
 * No-op logging until Supabase tables exist.
 * Auth/activity flows stay wired — writes are silently dropped.
 */
export function createLoggingRepository(): LoggingRepository {
  return {
    async createActivity() {
      // TBD: persist to Supabase activity_logs
    },
    async createError() {
      // TBD: persist to Supabase error_logs
    },
    async listActivity() {
      return { items: [], total: 0 }
    },
    async listErrors() {
      return { items: [], total: 0 }
    },
  }
}
