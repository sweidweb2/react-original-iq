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

export type ErrorLogDto = {
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
