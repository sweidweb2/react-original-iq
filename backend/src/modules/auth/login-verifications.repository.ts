import { randomInt, randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'

export type LoginVerificationType = 'email' | 'password_reset'

export type LoginVerificationRecord = {
  id: string
  userId: string
  code: string
  type: LoginVerificationType
  expiresAt: string
  used: boolean
  usedAt: string | null
  createdAt: string
  updatedAt: string
}

export type LoginVerificationsRepository = {
  invalidateUnusedForUser: (userId: string, type: LoginVerificationType) => Promise<void>
  create: (input: {
    userId: string
    code: string
    type: LoginVerificationType
    expiresAt: Date
  }) => Promise<LoginVerificationRecord>
  findActive: (input: {
    userId: string
    code: string
    type: LoginVerificationType
  }) => Promise<LoginVerificationRecord | null>
  markUsed: (id: string) => Promise<void>
}

type VerificationRow = {
  id: string
  user_id: string
  code: string
  type: LoginVerificationType
  expires_at: string
  used: boolean
  used_at: string | null
  created_at: string
  updated_at: string
}

const COLUMNS = 'id, user_id, code, type, expires_at, used, used_at, created_at, updated_at'

function toRecord(row: VerificationRow): LoginVerificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    code: row.code,
    type: row.type,
    expiresAt: row.expires_at,
    used: row.used,
    usedAt: row.used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function isActive(record: LoginVerificationRecord, now = Date.now()): boolean {
  if (record.used) return false
  return new Date(record.expiresAt).getTime() > now
}

const memoryVerifications = new Map<string, LoginVerificationRecord>()

function createMemoryLoginVerificationsRepository(): LoginVerificationsRepository {
  return {
    async invalidateUnusedForUser(userId, type) {
      for (const [id, row] of memoryVerifications) {
        if (row.userId === userId && row.type === type && !row.used) {
          memoryVerifications.set(id, {
            ...row,
            used: true,
            usedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      }
    },

    async create(input) {
      const now = new Date().toISOString()
      const record: LoginVerificationRecord = {
        id: randomUUID(),
        userId: input.userId,
        code: input.code,
        type: input.type,
        expiresAt: input.expiresAt.toISOString(),
        used: false,
        usedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      memoryVerifications.set(record.id, record)
      return record
    },

    async findActive(input) {
      for (const row of memoryVerifications.values()) {
        if (
          row.userId === input.userId &&
          row.code === input.code &&
          row.type === input.type &&
          isActive(row)
        ) {
          return row
        }
      }
      return null
    },

    async markUsed(id) {
      const row = memoryVerifications.get(id)
      if (!row) return
      memoryVerifications.set(id, {
        ...row,
        used: true,
        usedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    },
  }
}

/** Clear in-memory verification codes (tests only). */
export function resetLoginVerificationsRepositoryForTests(): void {
  memoryVerifications.clear()
}

/** Latest active password-reset code for a user (tests / dev without mailer). */
export function getPasswordResetCodeForTests(userId: string): string | null {
  let latest: LoginVerificationRecord | null = null
  for (const row of memoryVerifications.values()) {
    if (row.userId === userId && row.type === 'password_reset' && isActive(row)) {
      if (!latest || row.createdAt > latest.createdAt) {
        latest = row
      }
    }
  }
  return latest?.code ?? null
}

function createSupabaseLoginVerificationsRepository(
  config: AppConfig,
): LoginVerificationsRepository {
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }

  return {
    async invalidateUnusedForUser(userId, type) {
      const now = new Date().toISOString()
      const { error } = await client
        .from('login_verifications')
        .update({ used: true, used_at: now })
        .eq('user_id', userId)
        .eq('type', type)
        .eq('used', false)

      if (error) throw error
    },

    async create(input) {
      const { data, error } = await client
        .from('login_verifications')
        .insert({
          user_id: input.userId,
          code: input.code,
          type: input.type,
          expires_at: input.expiresAt.toISOString(),
          used: false,
        })
        .select(COLUMNS)
        .single()

      if (error) throw error
      return toRecord(data as VerificationRow)
    },

    async findActive(input) {
      const now = new Date().toISOString()
      const { data, error } = await client
        .from('login_verifications')
        .select(COLUMNS)
        .eq('user_id', input.userId)
        .eq('code', input.code)
        .eq('type', input.type)
        .eq('used', false)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data ? toRecord(data as VerificationRow) : null
    },

    async markUsed(id) {
      const now = new Date().toISOString()
      const { error } = await client
        .from('login_verifications')
        .update({ used: true, used_at: now })
        .eq('id', id)

      if (error) throw error
    },
  }
}

export function createLoginVerificationsRepository(
  config: AppConfig = loadConfig(),
): LoginVerificationsRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseLoginVerificationsRepository(config)
  }
  return createMemoryLoginVerificationsRepository()
}

export function generateSixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000
