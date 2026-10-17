import { apiRequest } from './api'
import type { AuthRole } from './auth'

export type ErrorLevel = 'error' | 'warning'

export type ErrorLogUser = {
  id: string
  email: string
  role: AuthRole | string
}

export type ErrorLog = {
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
  user: ErrorLogUser | null
}

export type ErrorLogListMeta = {
  page: number
  limit: number
  total: number
}

export type ErrorLogStats = {
  total: number
  today: number
  lastWeek: number
  errors: number
  warnings: number
}

export type ErrorLogListQuery = {
  page: number
  limit: number
  search?: string
  source?: string
  level?: ErrorLevel
  since?: string
}

export function listErrorLogs(query: ErrorLogListQuery) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.source) params.set('source', query.source)
  if (query.level) params.set('level', query.level)
  if (query.since) params.set('since', query.since)
  return apiRequest<{ data: ErrorLog[]; meta: ErrorLogListMeta }>(
    `/error-logs?${params.toString()}`,
  )
}

export function getErrorLogStats() {
  return apiRequest<ErrorLogStats>('/error-logs/stats')
}
