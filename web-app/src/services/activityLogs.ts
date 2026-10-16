import { apiRequest } from './api'
import type { AuthRole } from './auth'

export type ActivityLogUser = {
  id: string
  email: string
  role: AuthRole | string
}

export type ActivityLog = {
  id: string
  userId: string | null
  action: string
  entity: string | null
  entityId: string | null
  meta: unknown
  ip: string | null
  requestId: string | null
  createdAt: string
  user: ActivityLogUser | null
}

export type ActivityLogListMeta = {
  page: number
  limit: number
  total: number
}

export type ActivityLogStats = {
  total: number
  today: number
  auth: number
  users: number
  rbac: number
}

export type ActivityLogListQuery = {
  page: number
  limit: number
  search?: string
  actionPrefix?: string
  entity?: string
  since?: string
}

export function listActivityLogs(query: ActivityLogListQuery) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.actionPrefix) params.set('actionPrefix', query.actionPrefix)
  if (query.entity) params.set('entity', query.entity)
  if (query.since) params.set('since', query.since)
  return apiRequest<{ data: ActivityLog[]; meta: ActivityLogListMeta }>(
    `/activity-logs?${params.toString()}`,
  )
}

export function getActivityLogStats() {
  return apiRequest<ActivityLogStats>('/activity-logs/stats')
}
