import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import { ilikeAny } from '../_shared/query.js'
import type { ErrorLevel, ErrorLogStats } from './logging.types.js'

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
  source?: string | null
  level?: ErrorLevel
  requestId?: string | null
  userId?: string | null
  code?: string | null
  message: string
  stack?: string | null
  path?: string | null
  method?: string | null
  status?: number | null
  meta?: Record<string, unknown> | null
}

export type ErrorListFilter = {
  page: number
  limit: number
  search?: string
  source?: string
  level?: ErrorLevel
  since?: string
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
  createdAt: Date
  user: { id: string; email: string; role: string } | null
}

export type LoggingRepository = {
  createActivity: (input: CreateActivityInput) => Promise<void>
  createError: (input: CreateErrorInput) => Promise<void>
  listActivity: (filter: ActivityListFilter) => Promise<{
    items: ActivityLogRecord[]
    total: number
  }>
  countActivityStats: () => Promise<ActivityLogStats>
  listErrors: (filter: ErrorListFilter) => Promise<{
    items: ErrorLogRecord[]
    total: number
  }>
  countErrorStats: () => Promise<ErrorLogStats>
  /** Returns how many rows were removed. */
  deleteErrors: (ids: readonly string[]) => Promise<number>
  deleteAllErrors: () => Promise<number>
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
  source: string | null
  level: string | null
  request_id: string | null
  user_id: string | null
  code: string | null
  message: string
  stack: string | null
  path: string | null
  method: string | null
  status: number | null
  meta: Record<string, unknown> | null
  created_at: string
  users: { id: string; email: string; role: string } | null
}

const ERROR_SELECT =
  'id, source, level, request_id, user_id, code, message, stack, path, method, status, meta, created_at, users:user_id (id, email, role)'

const memoryActivity: ActivityLogRecord[] = []
const memoryErrors: ErrorLogRecord[] = []

/** Clear in-memory logs (tests only). */
export function resetLoggingRepositoryForTests(): void {
  memoryActivity.length = 0
  memoryErrors.length = 0
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function startOfTodayIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

function weekAgoIso(): string {
  return new Date(Date.now() - WEEK_MS).toISOString()
}

const ACTIVITY_SEARCH_FIELDS = ['action', 'entity', 'entity_id', 'request_id', 'ip']
const ERROR_SEARCH_FIELDS = ['message', 'code', 'path', 'request_id', 'source']

function matchesErrorFilter(row: ErrorLogRecord, filter: ErrorListFilter): boolean {
  if (filter.source && !row.source?.startsWith(filter.source)) return false
  if (filter.level && row.level !== filter.level) return false
  if (filter.since && row.createdAt < new Date(filter.since)) return false
  if (filter.search) {
    const needle = filter.search.toLowerCase()
    const hay = [row.message, row.code, row.path, row.requestId, row.source]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!hay.includes(needle)) return false
  }
  return true
}

function summarizeErrors(rows: ErrorLogRecord[]): ErrorLogStats {
  const todayStart = new Date(startOfTodayIso())
  const weekStart = new Date(weekAgoIso())
  let today = 0
  let lastWeek = 0
  let warnings = 0
  for (const row of rows) {
    if (row.createdAt >= todayStart) today += 1
    if (row.createdAt >= weekStart) lastWeek += 1
    if (row.level === 'warning') warnings += 1
  }
  return { total: rows.length, today, lastWeek, errors: rows.length - warnings, warnings }
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
    source: row.source,
    level: row.level === 'warning' ? 'warning' : 'error',
    requestId: row.request_id,
    userId: row.user_id,
    code: row.code,
    message: row.message,
    stack: row.stack,
    path: row.path,
    method: row.method,
    status: row.status,
    meta: row.meta,
    createdAt: new Date(row.created_at),
    user: row.users ? { id: row.users.id, email: row.users.email, role: row.users.role } : null,
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
        source: input.source ?? null,
        level: input.level ?? 'error',
        requestId: input.requestId ?? null,
        userId: input.userId ?? null,
        code: input.code ?? null,
        message: input.message,
        stack: input.stack ?? null,
        path: input.path ?? null,
        method: input.method ?? null,
        status: input.status ?? null,
        meta: input.meta ?? null,
        createdAt: new Date(),
        user: null,
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

    async listErrors(filter) {
      const filtered = memoryErrors.filter((row) => matchesErrorFilter(row, filter))
      const start = (filter.page - 1) * filter.limit
      return {
        items: filtered.slice(start, start + filter.limit),
        total: filtered.length,
      }
    },

    async countErrorStats() {
      return summarizeErrors(memoryErrors)
    },

    async deleteErrors(ids) {
      const targets = new Set(ids)
      const kept = memoryErrors.filter((row) => !targets.has(row.id))
      const deleted = memoryErrors.length - kept.length
      memoryErrors.splice(0, memoryErrors.length, ...kept)
      return deleted
    },

    async deleteAllErrors() {
      const deleted = memoryErrors.length
      memoryErrors.length = 0
      return deleted
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
        source: input.source ?? null,
        level: input.level ?? 'error',
        request_id: input.requestId ?? null,
        user_id: input.userId ?? null,
        code: input.code ?? null,
        message: input.message,
        stack: input.stack ?? null,
        path: input.path ?? null,
        method: input.method ?? null,
        status: input.status ?? null,
        meta: input.meta ?? null,
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
        const clause = ilikeAny(ACTIVITY_SEARCH_FIELDS, filter.search)
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

    async listErrors(filter) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      let query = client
        .from('error_logs')
        .select(ERROR_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filter.source) query = query.like('source', `${filter.source}%`)
      if (filter.level) query = query.eq('level', filter.level)
      if (filter.since) query = query.gte('created_at', filter.since)
      if (filter.search) {
        const clause = ilikeAny(ERROR_SEARCH_FIELDS, filter.search)
        if (clause) query = query.or(clause)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return {
        items: ((data ?? []) as unknown as ErrorRow[]).map(toError),
        total: count ?? 0,
      }
    },

    async countErrorStats() {
      const base = () => client.from('error_logs').select('id', { count: 'exact', head: true })

      const [totalRes, todayRes, weekRes, warningsRes] = await Promise.all([
        base(),
        base().gte('created_at', startOfTodayIso()),
        base().gte('created_at', weekAgoIso()),
        base().eq('level', 'warning'),
      ])

      for (const result of [totalRes, todayRes, weekRes, warningsRes]) {
        if (result.error) throw result.error
      }

      const total = totalRes.count ?? 0
      const warnings = warningsRes.count ?? 0
      return {
        total,
        today: todayRes.count ?? 0,
        lastWeek: weekRes.count ?? 0,
        errors: total - warnings,
        warnings,
      }
    },

    async deleteErrors(ids) {
      if (ids.length === 0) return 0
      const { error, count } = await client
        .from('error_logs')
        .delete({ count: 'exact' })
        .in('id', [...ids])
      if (error) throw error
      return count ?? 0
    },

    async deleteAllErrors() {
      // PostgREST rejects an unfiltered DELETE; this filter matches every row.
      const { error, count } = await client
        .from('error_logs')
        .delete({ count: 'exact' })
        .not('id', 'is', null)
      if (error) throw error
      return count ?? 0
    },
  }
}

export function createLoggingRepository(config: AppConfig = loadConfig()): LoggingRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseLoggingRepository(config)
  }
  return createMemoryLoggingRepository()
}
