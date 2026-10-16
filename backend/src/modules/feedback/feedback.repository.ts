import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type { CreateFeedbackInput, FeedbackListFilter, FeedbackRecord } from './feedback.types.js'

export type FeedbackRepository = {
  create: (input: CreateFeedbackInput) => Promise<FeedbackRecord>
  findPage: (filter: FeedbackListFilter) => Promise<{ items: FeedbackRecord[]; total: number }>
  deleteById: (id: string) => Promise<boolean>
}

const memoryFeedbacks: FeedbackRecord[] = []

export function resetFeedbackRepositoryForTests(): void {
  memoryFeedbacks.length = 0
}

function nowIso(): string {
  return new Date().toISOString()
}

function matchesSearch(row: FeedbackRecord, search?: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  const hay = [row.comments, row.suggestions, row.taskId, row.tutorId, row.clientId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

function matchesScope(row: FeedbackRecord, filter: FeedbackListFilter): boolean {
  if (filter.tutorId && row.tutorId !== filter.tutorId) return false
  if (filter.clientId && row.clientId !== filter.clientId) return false
  if (!matchesSearch(row, filter.search)) return false
  return true
}

function toRecord(input: CreateFeedbackInput, id: string, stamp: string): FeedbackRecord {
  return {
    id,
    taskId: input.taskId,
    tutorId: input.tutorId,
    clientId: input.clientId,
    rating: input.rating,
    comments: input.comments?.trim() || null,
    suggestions: input.suggestions?.trim() || null,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

type FeedbackRow = {
  id: string
  task_id: string
  tutor_id: string
  client_id: string
  rating: number | null
  comments: string | null
  suggestions: string | null
  created_at: string
  updated_at: string
}

function fromRow(row: FeedbackRow): FeedbackRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    tutorId: row.tutor_id,
    clientId: row.client_id,
    rating: row.rating ?? 0,
    comments: row.comments,
    suggestions: row.suggestions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function searchOr(search: string): string | null {
  const safe = search.replace(/[%_\\,()]/g, '').trim()
  if (!safe) return null
  const pattern = `%${safe}%`
  return `comments.ilike.${pattern},suggestions.ilike.${pattern},task_id.ilike.${pattern}`
}

function createMemoryFeedbackRepository(): FeedbackRepository {
  return {
    async create(input) {
      const stamp = nowIso()
      const record = toRecord(input, randomUUID(), stamp)
      memoryFeedbacks.push(record)
      return record
    },
    async findPage(filter) {
      const sorted = memoryFeedbacks
        .filter((row) => matchesScope(row, filter))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const start = (filter.page - 1) * filter.limit
      return {
        items: sorted.slice(start, start + filter.limit),
        total: sorted.length,
      }
    },
    async deleteById(id) {
      const index = memoryFeedbacks.findIndex((row) => row.id === id)
      if (index === -1) return false
      memoryFeedbacks.splice(index, 1)
      return true
    },
  }
}

function createSupabaseFeedbackRepository(config: AppConfig): FeedbackRepository {
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }

  return {
    async create(input) {
      const { data, error } = await client
        .from('feedbacks')
        .insert({
          task_id: input.taskId,
          tutor_id: input.tutorId,
          client_id: input.clientId,
          rating: input.rating,
          comments: input.comments?.trim() || null,
          suggestions: input.suggestions?.trim() || null,
        })
        .select('*')
        .single()
      if (error) throw error
      return fromRow(data as FeedbackRow)
    },
    async findPage(filter) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      let query = client
        .from('feedbacks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filter.tutorId) query = query.eq('tutor_id', filter.tutorId)
      if (filter.clientId) query = query.eq('client_id', filter.clientId)
      if (filter.search) {
        const clause = searchOr(filter.search)
        if (clause) query = query.or(clause)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return {
        items: (data as FeedbackRow[]).map(fromRow),
        total: count ?? 0,
      }
    },
    async deleteById(id) {
      const { error, count } = await client.from('feedbacks').delete({ count: 'exact' }).eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
  }
}

export function createFeedbackRepository(config: AppConfig = loadConfig()): FeedbackRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseFeedbackRepository(config)
  }
  return createMemoryFeedbackRepository()
}
