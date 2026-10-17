import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'

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

export type ActivityListFilter = {
  page: number
  limit: number
  search?: string
  actionPrefix?: string
  entity?: string
  since?: string
}

export type ActivityLogStats = {
  total: number
  today: number
  auth: number
  users: number
  rbac: number
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
  listActivity: (filter: ActivityListFilter) => Promise<{
    items: ActivityLogRecord[]
    total: number
  }>
  countActivityStats: () => Promise<ActivityLogStats>
  listErrors: (
    page: number,
    limit: number,
  ) => Promise<{
    items: ErrorLogRecord[]
    total: number
  }>
}

type ActivityRow = {
  id: string
  user_id: string | null
  action: string
  entity: string | null
  entity_id: string | null
  meta: Record<string, unknown> | null
  ip: string | null
  request_id: string | null
  created_at: string
  users: { id: string; email: string; role: string } | null
}

type ErrorRow = {
  id: string
  request_id: string | null
  user_id: string | null
  code: string | null
  message: string
  stack: string | null
  path: string | null
  method: string | null
  status: number | null
  created_at: string
}

const memoryActivity: ActivityLogRecord[] = []
const memoryErrors: ErrorLogRecord[] = []

/** Clear in-memory logs (tests only). */
export function resetLoggingRepositoryForTests(): void {
  memoryActivity.length = 0
  memoryErrors.length = 0
}

function startOfTodayIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

function searchClause(search: string): string | null {
  const safe = search.replace(/[%_\\,()]/g, '').trim()
  if (!safe) return null
  return `action.ilike.%${safe}%,entity.ilike.%${safe}%,entity_id.ilike.%${safe}%,request_id.ilike.%${safe}%,ip.ilike.%${safe}%`
}

function matchesActivityFilter(row: ActivityLogRecord, filter: ActivityListFilter): boolean {
  if (filter.actionPrefix && !row.action.startsWith(filter.actionPrefix)) return false
  if (filter.entity && row.entity !== filter.entity) return false
  if (filter.since && row.createdAt < new Date(filter.since)) return false
  if (filter.search) {
    const needle = filter.search.toLowerCase()
    const hay = [row.action, row.entity, row.entityId, row.requestId, row.ip]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!hay.includes(needle)) return false
  }
  return true
}

function toActivity(row: ActivityRow): ActivityLogRecord {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    meta: row.meta,
    ip: row.ip,
    requestId: row.request_id,
    createdAt: new Date(row.created_at),
    user: row.users ? { id: row.users.id, email: row.users.email, role: row.users.role } : null,
  }
}

function toError(row: ErrorRow): ErrorLogRecord {
  return {
    id: row.id,
    requestId: row.request_id,
    userId: row.user_id,
    code: row.code,
    message: row.message,
    stack: row.stack,
    path: row.path,
    method: row.method,
    status: row.status,
    createdAt: new Date(row.created_at),
  }
}

function summarizeActivity(rows: ActivityLogRecord[]): ActivityLogStats {
  const todayStart = new Date(startOfTodayIso())
  let today = 0
  let auth = 0
  let users = 0
  let rbac = 0
  for (const row of rows) {
    if (row.createdAt >= todayStart) today += 1
    if (row.action.startsWith('auth.')) auth += 1
    if (row.action.startsWith('users.')) users += 1
    if (row.action.startsWith('rbac.')) rbac += 1
  }
  return { total: rows.length, today, auth, users, rbac }
}

function createMemoryLoggingRepository(): LoggingRepository {
  return {
    async createActivity(input) {
      memoryActivity.unshift({
        id: randomUUID(),
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        meta: input.meta ?? null,
        ip: input.ip ?? null,
        requestId: input.requestId ?? null,
        createdAt: new Date(),
        user: null,
      })
    },

    async createError(input) {
      memoryErrors.unshift({
        id: randomUUID(),
        requestId: input.requestId ?? null,
        userId: input.userId ?? null,
        code: input.code ?? null,
        message: input.message,
        stack: input.stack ?? null,
        path: input.path ?? null,
        method: input.method ?? null,
        status: input.status ?? null,
        createdAt: new Date(),
      })
    },

    async listActivity(filter) {
      const filtered = memoryActivity.filter((row) => matchesActivityFilter(row, filter))
      const start = (filter.page - 1) * filter.limit
      return {
        items: filtered.slice(start, start + filter.limit),
        total: filtered.length,
      }
    },

    async countActivityStats() {
      return summarizeActivity(memoryActivity)
    },

    async listErrors(page, limit) {
      const start = (page - 1) * limit
      return {
        items: memoryErrors.slice(start, start + limit),
        total: memoryErrors.length,
      }
    },
  }
}

function createSupabaseLoggingRepository(config: AppConfig): LoggingRepository {
  const supabase = getSupabaseAdmin(config)
  if (!supabase) {
    throw new Error('Supabase admin client is not available')
  }
  const client = supabase

  return {
    async createActivity(input) {
      const { error } = await client.from('activity_logs').insert({
        user_id: input.userId ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entity_id: input.entityId ?? null,
        meta: input.meta ?? null,
        ip: input.ip ?? null,
        request_id: input.requestId ?? null,
      })
      if (error) throw error
    },

    async createError(input) {
      const { error } = await client.from('error_logs').insert({
        request_id: input.requestId ?? null,
        user_id: input.userId ?? null,
        code: input.code ?? null,
        message: input.message,
        stack: input.stack ?? null,
        path: input.path ?? null,
        method: input.method ?? null,
        status: input.status ?? null,
      })
      if (error) throw error
    },

    async listActivity(filter) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      let query = client
        .from('activity_logs')
        .select(
          'id, user_id, action, entity, entity_id, meta, ip, request_id, created_at, users:user_id (id, email, role)',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })

      if (filter.actionPrefix) query = query.like('action', `${filter.actionPrefix}%`)
      if (filter.entity) query = query.eq('entity', filter.entity)
      if (filter.since) query = query.gte('created_at', filter.since)
      if (filter.search) {
        const clause = searchClause(filter.search)
        if (clause) query = query.or(clause)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return {
        items: ((data ?? []) as unknown as ActivityRow[]).map(toActivity),
        total: count ?? 0,
      }
    },

    async countActivityStats() {
      const today = startOfTodayIso()
      const base = () => client.from('activity_logs').select('id', { count: 'exact', head: true })

      const [totalRes, todayRes, authRes, usersRes, rbacRes] = await Promise.all([
        base(),
        base().gte('created_at', today),
        base().like('action', 'auth.%'),
        base().like('action', 'users.%'),
        base().like('action', 'rbac.%'),
      ])

      for (const result of [totalRes, todayRes, authRes, usersRes, rbacRes]) {
        if (result.error) throw result.error
      }

      return {
        total: totalRes.count ?? 0,
        today: todayRes.count ?? 0,
        auth: authRes.count ?? 0,
        users: usersRes.count ?? 0,
        rbac: rbacRes.count ?? 0,
      }
    },

    async listErrors(page, limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      const { data, error, count } = await client
        .from('error_logs')
        .select('id, request_id, user_id, code, message, stack, path, method, status, created_at', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return {
        items: ((data ?? []) as ErrorRow[]).map(toError),
        total: count ?? 0,
      }
    },
  }
}

export function createLoggingRepository(config: AppConfig = loadConfig()): LoggingRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseLoggingRepository(config)
  }
  return createMemoryLoggingRepository()
}
