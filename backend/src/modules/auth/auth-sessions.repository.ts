import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'

export type AuthSessionRecord = {
  id: string
  userId: string
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AuthSessionsRepository = {
  create: (input: { userId: string; expiresAt: Date }) => Promise<AuthSessionRecord>
  findById: (id: string) => Promise<AuthSessionRecord | null>
  revoke: (id: string) => Promise<void>
  /** Revoke every live session for a user, optionally keeping one (the caller's). */
  revokeAllForUser: (userId: string, options?: { exceptId?: string }) => Promise<void>
}

type SessionRow = {
  id: string
  user_id: string
  expires_at: string
  revoked_at: string | null
  created_at: string
  updated_at: string
}

const COLUMNS = 'id, user_id, expires_at, revoked_at, created_at, updated_at'

function toRecord(row: SessionRow): AuthSessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function isSessionLive(session: AuthSessionRecord, now = Date.now()): boolean {
  return session.revokedAt === null && new Date(session.expiresAt).getTime() > now
}

const memorySessions = new Map<string, AuthSessionRecord>()

function createMemoryAuthSessionsRepository(): AuthSessionsRepository {
  function revokeRow(row: AuthSessionRecord): void {
    const now = new Date().toISOString()
    memorySessions.set(row.id, { ...row, revokedAt: now, updatedAt: now })
  }

  return {
    async create(input) {
      for (const [id, row] of memorySessions) {
        if (row.userId === input.userId && !isSessionLive(row)) {
          memorySessions.delete(id)
        }
      }
      const now = new Date().toISOString()
      const record: AuthSessionRecord = {
        id: randomUUID(),
        userId: input.userId,
        expiresAt: input.expiresAt.toISOString(),
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      memorySessions.set(record.id, record)
      return record
    },

    async findById(id) {
      return memorySessions.get(id) ?? null
    },

    async revoke(id) {
      const row = memorySessions.get(id)
      if (row && row.revokedAt === null) revokeRow(row)
    },

    async revokeAllForUser(userId, options) {
      for (const row of memorySessions.values()) {
        if (row.userId === userId && row.revokedAt === null && row.id !== options?.exceptId) {
          revokeRow(row)
        }
      }
    },
  }
}

/** Clear in-memory sessions (tests only). */
export function resetAuthSessionsRepositoryForTests(): void {
  memorySessions.clear()
}

function createSupabaseAuthSessionsRepository(config: AppConfig): AuthSessionsRepository {
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }

  return {
    async create(input) {
      const { error: purgeError } = await client
        .from('auth_sessions')
        .delete()
        .eq('user_id', input.userId)
        .or(`expires_at.lt.${new Date().toISOString()},revoked_at.not.is.null`)
      if (purgeError) throw purgeError

      const { data, error } = await client
        .from('auth_sessions')
        .insert({
          user_id: input.userId,
          expires_at: input.expiresAt.toISOString(),
        })
        .select(COLUMNS)
        .single()

      if (error) throw error
      return toRecord(data as SessionRow)
    },

    async findById(id) {
      const { data, error } = await client
        .from('auth_sessions')
        .select(COLUMNS)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data ? toRecord(data as SessionRow) : null
    },

    async revoke(id) {
      const { error } = await client
        .from('auth_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .is('revoked_at', null)

      if (error) throw error
    },

    async revokeAllForUser(userId, options) {
      let query = client
        .from('auth_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('revoked_at', null)
      if (options?.exceptId) {
        query = query.neq('id', options.exceptId)
      }
      const { error } = await query

      if (error) throw error
    },
  }
}

export function createAuthSessionsRepository(
  config: AppConfig = loadConfig(),
): AuthSessionsRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseAuthSessionsRepository(config)
  }
  return createMemoryAuthSessionsRepository()
}
