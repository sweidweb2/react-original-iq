import { randomInt, randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'

export type LoginVerificationType = 'email' | 'password_reset'

export type LoginVerificationRecord = {
  id: string
  userId: string
  /** sha256 hex of the code; the plain code is never stored. */
  codeHash: string
  type: LoginVerificationType
  expiresAt: string
  used: boolean
  usedAt: string | null
  attempts: number
  createdAt: string
  updatedAt: string
}

export type LoginVerificationsRepository = {
  invalidateUnusedForUser: (userId: string, type: LoginVerificationType) => Promise<void>
  create: (input: {
    userId: string
    codeHash: string
    type: LoginVerificationType
    expiresAt: Date
  }) => Promise<LoginVerificationRecord>
  /** Newest unused, unexpired code for the user. */
  findLatestActive: (input: {
    userId: string
    type: LoginVerificationType
  }) => Promise<LoginVerificationRecord | null>
  /** Atomically counts a wrong guess; burns the code once `maxAttempts` is reached. Returns attempts. */
  registerFailedAttempt: (id: string, maxAttempts: number) => Promise<number>
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
  attempts: number
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id, user_id, code, type, expires_at, used, used_at, attempts, created_at, updated_at'

function toRecord(row: VerificationRow): LoginVerificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    codeHash: row.code,
    type: row.type,
    expiresAt: row.expires_at,
    used: row.used,
    usedAt: row.used_at,
    attempts: row.attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function isActive(record: LoginVerificationRecord, now = Date.now()): boolean {
  if (record.used) return false
  return new Date(record.expiresAt).getTime() > now
}

const memoryVerifications = new Map<string, LoginVerificationRecord>()
/** Plain codes for the in-memory store only, so tests and local dev can read them back. */
const memoryPlainCodes = new Map<string, string>()

function createMemoryLoginVerificationsRepository(): LoginVerificationsRepository {
  function markUsedRow(row: LoginVerificationRecord): void {
    const now = new Date().toISOString()
    memoryVerifications.set(row.id, { ...row, used: true, usedAt: now, updatedAt: now })
  }

  return {
    async invalidateUnusedForUser(userId, type) {
      for (const row of memoryVerifications.values()) {
        if (row.userId === userId && row.type === type && !row.used) {
          markUsedRow(row)
        }
      }
    },

    async create(input) {
      const now = new Date().toISOString()
      const record: LoginVerificationRecord = {
        id: randomUUID(),
        userId: input.userId,
        codeHash: input.codeHash,
        type: input.type,
        expiresAt: input.expiresAt.toISOString(),
        used: false,
        usedAt: null,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      }
      memoryVerifications.set(record.id, record)
      return record
    },

    async findLatestActive(input) {
      let latest: LoginVerificationRecord | null = null
      for (const row of memoryVerifications.values()) {
        if (row.userId === input.userId && row.type === input.type && isActive(row)) {
          if (!latest || row.createdAt >= latest.createdAt) latest = row
        }
      }
      return latest
    },

    async registerFailedAttempt(id, maxAttempts) {
      const row = memoryVerifications.get(id)
      if (!row) return maxAttempts
      const attempts = row.attempts + 1
      const now = new Date().toISOString()
      const burned = attempts >= maxAttempts
      memoryVerifications.set(id, {
        ...row,
        attempts,
        used: row.used || burned,
        usedAt: burned ? now : row.usedAt,
        updatedAt: now,
      })
      return attempts
    },

    async markUsed(id) {
      const row = memoryVerifications.get(id)
      if (row) markUsedRow(row)
    },
  }
}

/** Clear in-memory verification codes (tests only). */
export function resetLoginVerificationsRepositoryForTests(): void {
  memoryVerifications.clear()
  memoryPlainCodes.clear()
}

/** In-memory store only: remember the plain code so tests / local dev can read it back. */
export function rememberPlainCodeForTests(recordId: string, code: string): void {
  memoryPlainCodes.set(recordId, code)
}

/** Latest active password-reset code for a user (in-memory store only). */
export function getPasswordResetCodeForTests(userId: string): string | null {
  let latest: LoginVerificationRecord | null = null
  for (const row of memoryVerifications.values()) {
    if (row.userId === userId && row.type === 'password_reset' && isActive(row)) {
      if (!latest || row.createdAt >= latest.createdAt) {
        latest = row
      }
    }
  }
  return latest ? (memoryPlainCodes.get(latest.id) ?? null) : null
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
          code: input.codeHash,
          type: input.type,
          expires_at: input.expiresAt.toISOString(),
          used: false,
        })
        .select(COLUMNS)
        .single()

      if (error) throw error
      return toRecord(data as VerificationRow)
    },

    async findLatestActive(input) {
      const now = new Date().toISOString()
      const { data, error } = await client
        .from('login_verifications')
        .select(COLUMNS)
        .eq('user_id', input.userId)
        .eq('type', input.type)
        .eq('used', false)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data ? toRecord(data as VerificationRow) : null
    },

    async registerFailedAttempt(id, maxAttempts) {
      const { data, error } = await client.rpc('login_verification_register_failure', {
        p_id: id,
        p_max_attempts: maxAttempts,
      })
      if (error) throw error
      return typeof data === 'number' ? data : maxAttempts
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

/** Wrong guesses allowed per code before it is burned and a new one must be requested. */
export const PASSWORD_RESET_MAX_ATTEMPTS = 5
