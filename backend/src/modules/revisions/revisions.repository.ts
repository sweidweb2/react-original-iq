import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import { conflict } from '../../errors/app-error.js'
import type {
  CreateRevisionInput,
  RevisionDetail,
  RevisionSession,
  RevisionSessionSolution,
  RevisionStatus,
  UpdateRevisionInput,
} from './revisions.types.js'

export const OPEN_REVISION_STATUSES: RevisionStatus[] = [
  'in-revision',
  'waiting_coordinator_approval',
]

const OPEN_SESSION_CONFLICT = 'This task already has an open revision'

export type RevisionsRepository = {
  /** Throws 409 if the task already has an open session (partial unique index in migration 021). */
  create: (input: CreateRevisionInput) => Promise<RevisionSession>
  findById: (id: string) => Promise<RevisionDetail | null>
  listByTaskId: (taskId: string) => Promise<RevisionSession[]>
  hasOpenForTask: (taskId: string) => Promise<boolean>
  /** Returns null when the row is missing or its status is no longer in `expectedFrom`. */
  update: (
    id: string,
    input: UpdateRevisionInput,
    expectedFrom: RevisionStatus[],
  ) => Promise<RevisionSession | null>
  /** Returns null when the row is missing or its status is no longer in `expectedFrom`. */
  setStatus: (
    id: string,
    status: RevisionStatus,
    options: { expectedFrom: RevisionStatus[]; submitDate?: string | null },
  ) => Promise<RevisionSession | null>
  /** Cancels every open session of the task; returns how many were cancelled. */
  cancelOpenForTask: (taskId: string) => Promise<number>
  linkSolutions: (
    revisionSessionId: string,
    solutionIds: string[],
  ) => Promise<RevisionSessionSolution[]>
  listSolutions: (revisionSessionId: string) => Promise<RevisionSessionSolution[]>
}

const memorySessions: RevisionSession[] = []
const memorySessionSolutions: RevisionSessionSolution[] = []

export function resetRevisionsRepositoryForTests(): void {
  memorySessions.length = 0
  memorySessionSolutions.length = 0
}

function nowIso(): string {
  return new Date().toISOString()
}

function toSession(input: CreateRevisionInput, id: string, stamp: string): RevisionSession {
  return {
    id,
    taskId: input.taskId,
    startDate: input.startDate ?? stamp,
    deadline: input.deadline ?? null,
    submitDate: null,
    status: 'in-revision',
    title: input.title?.trim() || null,
    description: input.description?.trim() || null,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

type RevisionRow = {
  id: string
  task_id: string
  start_date: string | null
  deadline: string | null
  submit_date: string | null
  status: RevisionStatus
  title: string | null
  description: string | null
  created_at: string
  updated_at: string
}

type RevisionSolutionRow = {
  id: string
  revision_session_id: string
  solution_id: string
  date: string | null
  created_at: string
  updated_at: string
}

function fromRow(row: RevisionRow): RevisionSession {
  return {
    id: row.id,
    taskId: row.task_id,
    startDate: row.start_date,
    deadline: row.deadline,
    submitDate: row.submit_date,
    status: row.status,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function fromSolutionRow(row: RevisionSolutionRow): RevisionSessionSolution {
  return {
    id: row.id,
    revisionSessionId: row.revision_session_id,
    solutionId: row.solution_id,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function createMemoryRevisionsRepository(): RevisionsRepository {
  return {
    async create(input) {
      const hasOpen = memorySessions.some(
        (row) => row.taskId === input.taskId && OPEN_REVISION_STATUSES.includes(row.status),
      )
      if (hasOpen) throw conflict(OPEN_SESSION_CONFLICT)
      const stamp = nowIso()
      const session = toSession(input, randomUUID(), stamp)
      memorySessions.push(session)
      return session
    },
    async findById(id) {
      const session = memorySessions.find((row) => row.id === id)
      if (!session) return null
      const solutions = memorySessionSolutions.filter((row) => row.revisionSessionId === id)
      return { ...session, solutions }
    },
    async listByTaskId(taskId) {
      return memorySessions
        .filter((row) => row.taskId === taskId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async hasOpenForTask(taskId) {
      return memorySessions.some(
        (row) => row.taskId === taskId && OPEN_REVISION_STATUSES.includes(row.status),
      )
    },
    async update(id, input, expectedFrom) {
      const index = memorySessions.findIndex((row) => row.id === id)
      if (index === -1) return null
      const current = memorySessions[index]!
      if (!expectedFrom.includes(current.status)) return null
      const updated: RevisionSession = {
        ...current,
        title: input.title !== undefined ? input.title?.trim() || null : current.title,
        description:
          input.description !== undefined ? input.description?.trim() || null : current.description,
        startDate: input.startDate !== undefined ? input.startDate : current.startDate,
        deadline: input.deadline !== undefined ? input.deadline : current.deadline,
        updatedAt: nowIso(),
      }
      memorySessions[index] = updated
      return updated
    },
    async setStatus(id, status, options) {
      const index = memorySessions.findIndex((row) => row.id === id)
      if (index === -1) return null
      const current = memorySessions[index]!
      if (!options.expectedFrom.includes(current.status)) return null
      const updated: RevisionSession = {
        ...current,
        status,
        submitDate: options.submitDate !== undefined ? options.submitDate : current.submitDate,
        updatedAt: nowIso(),
      }
      memorySessions[index] = updated
      return updated
    },
    async cancelOpenForTask(taskId) {
      let cancelled = 0
      const stamp = nowIso()
      memorySessions.forEach((row, index) => {
        if (row.taskId === taskId && OPEN_REVISION_STATUSES.includes(row.status)) {
          memorySessions[index] = { ...row, status: 'cancelled', updatedAt: stamp }
          cancelled += 1
        }
      })
      return cancelled
    },
    async linkSolutions(revisionSessionId, solutionIds) {
      const stamp = nowIso()
      const created: RevisionSessionSolution[] = []
      for (const solutionId of solutionIds) {
        const row: RevisionSessionSolution = {
          id: randomUUID(),
          revisionSessionId,
          solutionId,
          date: stamp,
          createdAt: stamp,
          updatedAt: stamp,
        }
        memorySessionSolutions.push(row)
        created.push(row)
      }
      return created
    },
    async listSolutions(revisionSessionId) {
      return memorySessionSolutions.filter((row) => row.revisionSessionId === revisionSessionId)
    },
  }
}

function createSupabaseRevisionsRepository(config: AppConfig): RevisionsRepository {
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }

  const columns =
    'id, task_id, start_date, deadline, submit_date, status, title, description, created_at, updated_at'

  return {
    async create(input) {
      const { data, error } = await client
        .from('revision_sessions')
        .insert({
          task_id: input.taskId,
          title: input.title?.trim() || null,
          description: input.description?.trim() || null,
          start_date: input.startDate ?? undefined,
          deadline: input.deadline ?? null,
        })
        .select(columns)
        .single()
      if (error?.code === '23505') throw conflict(OPEN_SESSION_CONFLICT)
      if (error) throw error
      return fromRow(data as RevisionRow)
    },
    async findById(id) {
      const { data, error } = await client
        .from('revision_sessions')
        .select(columns)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const solutions = await this.listSolutions(id)
      return { ...fromRow(data as RevisionRow), solutions }
    },
    async listByTaskId(taskId) {
      const { data, error } = await client
        .from('revision_sessions')
        .select(columns)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as RevisionRow[]).map(fromRow)
    },
    async hasOpenForTask(taskId) {
      const { count, error } = await client
        .from('revision_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId)
        .in('status', OPEN_REVISION_STATUSES)
      if (error) throw error
      return (count ?? 0) > 0
    },
    async update(id, input, expectedFrom) {
      const patch: Record<string, unknown> = {}
      if (input.title !== undefined) patch.title = input.title?.trim() || null
      if (input.description !== undefined) patch.description = input.description?.trim() || null
      if (input.startDate !== undefined) patch.start_date = input.startDate
      if (input.deadline !== undefined) patch.deadline = input.deadline
      const { data, error } = await client
        .from('revision_sessions')
        .update(patch)
        .eq('id', id)
        .in('status', expectedFrom)
        .select(columns)
        .maybeSingle()
      if (error) throw error
      return data ? fromRow(data as RevisionRow) : null
    },
    async setStatus(id, status, options) {
      const patch: Record<string, unknown> = { status }
      if (options.submitDate !== undefined) patch.submit_date = options.submitDate
      const { data, error } = await client
        .from('revision_sessions')
        .update(patch)
        .eq('id', id)
        .in('status', options.expectedFrom)
        .select(columns)
        .maybeSingle()
      if (error) throw error
      return data ? fromRow(data as RevisionRow) : null
    },
    async cancelOpenForTask(taskId) {
      const { data, error } = await client
        .from('revision_sessions')
        .update({ status: 'cancelled' })
        .eq('task_id', taskId)
        .in('status', OPEN_REVISION_STATUSES)
        .select('id')
      if (error) throw error
      return (data ?? []).length
    },
    async linkSolutions(revisionSessionId, solutionIds) {
      if (solutionIds.length === 0) return []
      const stamp = nowIso()
      const rows = solutionIds.map((solutionId) => ({
        revision_session_id: revisionSessionId,
        solution_id: solutionId,
        date: stamp,
      }))
      const { data, error } = await client
        .from('revision_session_solutions')
        .insert(rows)
        .select('id, revision_session_id, solution_id, date, created_at, updated_at')
      if (error) throw error
      return (data as RevisionSolutionRow[]).map(fromSolutionRow)
    },
    async listSolutions(revisionSessionId) {
      const { data, error } = await client
        .from('revision_session_solutions')
        .select('id, revision_session_id, solution_id, date, created_at, updated_at')
        .eq('revision_session_id', revisionSessionId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as RevisionSolutionRow[]).map(fromSolutionRow)
    },
  }
}

export function createRevisionsRepository(config: AppConfig = loadConfig()): RevisionsRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseRevisionsRepository(config)
  }
  return createMemoryRevisionsRepository()
}
