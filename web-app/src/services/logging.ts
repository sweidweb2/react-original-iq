import { useAuthStore } from '@/stores/authStore'

import { apiRequest } from './api'

export type ActivityLogItem = {
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

export type ErrorLogItem = {
  id: string
  requestId: string | null
  userId: string | null
  code: string | null
  message: string
  stack: string | null
  path: string | null
  method: string | null
  status: number | null
  createdAt: string
}

export type PaginatedLogs<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

function accessToken() {
  return useAuthStore.getState().tokens?.accessToken ?? null
}

export function listActivityLogs(page = 1, limit = 20) {
  return apiRequest<PaginatedLogs<ActivityLogItem>>(`/activity-logs?page=${page}&limit=${limit}`, {
    accessToken: accessToken(),
  })
}

export function listErrorLogs(page = 1, limit = 20) {
  return apiRequest<PaginatedLogs<ErrorLogItem>>(`/error-logs?page=${page}&limit=${limit}`, {
    accessToken: accessToken(),
  })
}
