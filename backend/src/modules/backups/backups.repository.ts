import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin, selectAllRows } from '../../database/index.js'
import type { BackupFormat, BackupType } from './backups.schema.js'
import { type BackupTable, tableOrderBy } from './backups.tables.js'
import type { BackupStatus } from './backups.types.js'

export type TableRow = Record<string, unknown>

export type BackupHistoryRecord = {
  id: string
  type: BackupType
  target: string | null
  format: BackupFormat
  status: BackupStatus
  filename: string | null
  sizeBytes: number | null
  rowCount: number | null
  fileCount: number | null
  durationMs: number | null
  error: string | null
  rerunOf: string | null
  requestedBy: string | null
  requester: { id: string; name: string | null; email: string } | null
  createdAt: Date
  updatedAt: Date
}

export type CreateBackupHistoryInput = {
  type: BackupType
  target: string | null
  format: BackupFormat
  filename: string
  requestedBy: string
  rerunOf: string | null
}

export type CompleteBackupHistoryInput = {
  sizeBytes: number
  rowCount: number | null
  fileCount: number | null
  durationMs: number
}

export type BackupsRepository = {
  /** Every row of a whitelisted table (all columns), read in key order. */
  readTable: (table: BackupTable) => Promise<TableRow[]>
  createHistory: (input: CreateBackupHistoryInput) => Promise<BackupHistoryRecord>
  completeHistory: (id: string, input: CompleteBackupHistoryInput) => Promise<void>
  failHistory: (id: string, error: string, durationMs: number) => Promise<void>
  listHistory: (
    page: number,
    limit: number,
  ) => Promise<{ items: BackupHistoryRecord[]; total: number }>
  getHistory: (id: string) => Promise<BackupHistoryRecord | null>
}

const MAX_ERROR_LENGTH = 2000

const HISTORY_COLUMNS =
  'id, type, target, format, status, filename, size_bytes, row_count, file_count, duration_ms, error, rerun_of, requested_by, created_at, updated_at, requester:requested_by (id, name, email)'

type HistoryRow = {
  id: string
  type: BackupType
  target: string | null
  format: BackupFormat
  status: BackupStatus
  filename: string | null
  size_bytes: number | string | null
  row_count: number | null
  file_count: number | null
  duration_ms: number | null
  error: string | null
  rerun_of: string | null
  requested_by: string | null
  created_at: string
  updated_at: string
  requester: { id: string; name: string | null; email: string } | null
}

function toRecord(row: HistoryRow): BackupHistoryRecord {
  return {
    id: row.id,
    type: row.type,
    target: row.target,
    format: row.format,
    status: row.status,
    filename: row.filename,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    rowCount: row.row_count,
    fileCount: row.file_count,
    durationMs: row.duration_ms,
    error: row.error,
    rerunOf: row.rerun_of,
    requestedBy: row.requested_by,
    requester: row.requester,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function truncateError(message: string): string {
  return message.length > MAX_ERROR_LENGTH ? `${message.slice(0, MAX_ERROR_LENGTH)}…` : message
}

const memoryHistory: BackupHistoryRecord[] = []

/** Clear in-memory backup history (tests only). */
export function resetBackupsRepositoryForTests(): void {
  memoryHistory.length = 0
}

/** Memory mode has no table data to dump; history is kept in-process. */
function createMemoryBackupsRepository(): BackupsRepository {
  function find(id: string) {
    return memoryHistory.find((row) => row.id === id) ?? null
  }

  return {
    async readTable() {
      return []
    },

    async createHistory(input) {
      const now = new Date()
      const record: BackupHistoryRecord = {
        id: randomUUID(),
        type: input.type,
        target: input.target,
        format: input.format,
        status: 'running',
        filename: input.filename,
        sizeBytes: null,
        rowCount: null,
        fileCount: null,
        durationMs: null,
        error: null,
        rerunOf: input.rerunOf,
        requestedBy: input.requestedBy,
        requester: null,
        createdAt: now,
        updatedAt: now,
      }
      memoryHistory.unshift(record)
      return record
    },

    async completeHistory(id, input) {
      const row = find(id)
      if (!row) return
      Object.assign(row, { ...input, status: 'completed', updatedAt: new Date() })
    },

    async failHistory(id, error, durationMs) {
      const row = find(id)
      if (!row) return
      Object.assign(row, {
        status: 'failed',
        error: truncateError(error),
        durationMs,
        updatedAt: new Date(),
      })
    },

    async listHistory(page, limit) {
      const start = (page - 1) * limit
      return { items: memoryHistory.slice(start, start + limit), total: memoryHistory.length }
    },

    async getHistory(id) {
      return find(id)
    },
  }
}

function createSupabaseBackupsRepository(config: AppConfig): BackupsRepository {
  const supabase = getSupabaseAdmin(config)
  if (!supabase) {
    throw new Error('Supabase admin client is not available')
  }
  const client = supabase

  return {
    readTable(table) {
      return selectAllRows<TableRow>(client, table, '*', tableOrderBy(table))
    },

    async createHistory(input) {
      const { data, error } = await client
        .from('backup_history')
        .insert({
          type: input.type,
          target: input.target,
          format: input.format,
          filename: input.filename,
          status: 'running',
          requested_by: input.requestedBy,
          rerun_of: input.rerunOf,
        })
        .select(HISTORY_COLUMNS)
        .single()
      if (error) throw error
      return toRecord(data as unknown as HistoryRow)
    },

    async completeHistory(id, input) {
      const { error } = await client
        .from('backup_history')
        .update({
          status: 'completed',
          size_bytes: input.sizeBytes,
          row_count: input.rowCount,
          file_count: input.fileCount,
          duration_ms: input.durationMs,
          error: null,
        })
        .eq('id', id)
      if (error) throw error
    },

    async failHistory(id, message, durationMs) {
      const { error } = await client
        .from('backup_history')
        .update({ status: 'failed', error: truncateError(message), duration_ms: durationMs })
        .eq('id', id)
      if (error) throw error
    },

    async listHistory(page, limit) {
      const from = (page - 1) * limit
      const { data, error, count } = await client
        .from('backup_history')
        .select(HISTORY_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1)
      if (error) throw error
      return {
        items: ((data ?? []) as unknown as HistoryRow[]).map(toRecord),
        total: count ?? 0,
      }
    },

    async getHistory(id) {
      const { data, error } = await client
        .from('backup_history')
        .select(HISTORY_COLUMNS)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? toRecord(data as unknown as HistoryRow) : null
    },
  }
}

export function createBackupsRepository(config: AppConfig = loadConfig()): BackupsRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseBackupsRepository(config)
  }
  return createMemoryBackupsRepository()
}
