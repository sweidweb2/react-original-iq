import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type { CreateSpecializationInput, Specialization } from './specializations.types.js'

export type SpecializationsRepository = {
  listByTutorId: (tutorId: string) => Promise<Specialization[]>
  findById: (id: string) => Promise<Specialization | null>
  create: (input: CreateSpecializationInput) => Promise<Specialization>
  deleteById: (id: string) => Promise<boolean>
}

const memoryRows: Specialization[] = []

export function resetSpecializationsRepositoryForTests(): void {
  memoryRows.length = 0
}

function nowIso(): string {
  return new Date().toISOString()
}

type SpecRow = {
  id: string
  tutor_id: string
  name: string
  note: string | null
  created_at: string
  updated_at: string
}

function fromRow(row: SpecRow): Specialization {
  return {
    id: row.id,
    tutorId: row.tutor_id,
    name: row.name,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function createMemoryRepository(): SpecializationsRepository {
  return {
    async listByTutorId(tutorId) {
      return memoryRows
        .filter((row) => row.tutorId === tutorId)
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    async findById(id) {
      return memoryRows.find((row) => row.id === id) ?? null
    },
    async create(input) {
      const stamp = nowIso()
      const row: Specialization = {
        id: randomUUID(),
        tutorId: input.tutorId,
        name: input.name.trim(),
        note: input.note?.trim() || null,
        createdAt: stamp,
        updatedAt: stamp,
      }
      memoryRows.push(row)
      return row
    },
    async deleteById(id) {
      const index = memoryRows.findIndex((row) => row.id === id)
      if (index < 0) return false
      memoryRows.splice(index, 1)
      return true
    },
  }
}

function createSupabaseRepository(config: AppConfig): SpecializationsRepository {
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }
  const columns = 'id, tutor_id, name, note, created_at, updated_at'

  return {
    async listByTutorId(tutorId) {
      const { data, error } = await client
        .from('specializations')
        .select(columns)
        .eq('tutor_id', tutorId)
        .order('name', { ascending: true })
      if (error) throw error
      return (data as SpecRow[]).map(fromRow)
    },
    async findById(id) {
      const { data, error } = await client.from('specializations').select(columns).eq('id', id).maybeSingle()
      if (error) throw error
      return data ? fromRow(data as SpecRow) : null
    },
    async create(input) {
      const { data, error } = await client
        .from('specializations')
        .insert({
          tutor_id: input.tutorId,
          name: input.name.trim(),
          note: input.note?.trim() || null,
        })
        .select(columns)
        .single()
      if (error) throw error
      return fromRow(data as SpecRow)
    },
    async deleteById(id) {
      const { error, count } = await client
        .from('specializations')
        .delete({ count: 'exact' })
        .eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
  }
}

export function createSpecializationsRepository(
  config: AppConfig = loadConfig(),
): SpecializationsRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseRepository(config)
  }
  return createMemoryRepository()
}
