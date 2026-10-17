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

export const ERROR_LEVELS = ['error', 'warning'] as const
export type ErrorLevel = (typeof ERROR_LEVELS)[number]

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

export type PaginatedLogs<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
  }
}
