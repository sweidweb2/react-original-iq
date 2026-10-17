export type ActivityLogDto = {
  id: string
  userId: string | null
  action: string
  entity: string | null
  entityId: string | null
  meta: unknown
  ip: string | null
  requestId: string | null
  createdAt: string
  user: {
    id: string
    email: string
    role: string
  } | null
}

import type { ErrorLevel } from '../../errors/report-error.js'
import type { ListResult } from '../_shared/list-result.js'

export { ERROR_LEVELS, type ErrorLevel } from '../../errors/report-error.js'

export type ErrorLogDto = {
  id: string
  source: string | null
  level: ErrorLevel
  requestId: string | null
  userId: string | null
  code: string | null
  message: string
  stack: string | null
  path: string | null
  method: string | null
  status: number | null
  meta: Record<string, unknown> | null
  createdAt: string
  user: {
    id: string
    email: string
    role: string
  } | null
}

export type ErrorLogStats = {
  total: number
  today: number
  lastWeek: number
  errors: number
  warnings: number
}

export type PaginatedLogs<T> = ListResult<T>
