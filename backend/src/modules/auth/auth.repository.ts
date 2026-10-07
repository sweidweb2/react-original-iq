import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type { RoleName } from './auth.schema.js'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type AuthUserRecord = {
  id: string
  email: string
  passwordHash: string
  role: RoleName
  status: UserStatus
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
  } | null
}

export type CreateAuthUserInput = {
  email: string
  passwordHash: string
  role: RoleName
  firstName?: string
  lastName?: string
  name?: string
}

export type AuthRepository = {
  findByEmail: (email: string) => Promise<AuthUserRecord | null>
  findById: (id: string) => Promise<AuthUserRecord | null>
  createUserWithProfile: (input: CreateAuthUserInput) => Promise<AuthUserRecord>
}

type UserRow = {
  id: string
  email: string
  password_hash: string
  role: RoleName
  is_active: boolean
  name: string
}

function splitName(name: string): {
  firstName: string | null
  lastName: string | null
  displayName: string
} {
  const trimmed = name.trim()
  const parts = trimmed.split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : null,
    displayName: trimmed || 'User',
  }
}

function toRecord(row: UserRow): AuthUserRecord {
  const profile = splitName(row.name)
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.is_active ? 'ACTIVE' : 'INACTIVE',
    profile,
  }
}

/** Shared in-memory store so createAuthRepository() + createApp() see the same users in tests. */
const memoryUsersById = new Map<string, AuthUserRecord>()
const memoryIdsByEmail = new Map<string, string>()

function createMemoryAuthRepository(): AuthRepository {
  return {
    async findByEmail(email) {
      const id = memoryIdsByEmail.get(email)
      return id ? (memoryUsersById.get(id) ?? null) : null
    },

    async findById(id) {
      return memoryUsersById.get(id) ?? null
    },

    async createUserWithProfile(input) {
      const displayName =
        input.name?.trim() ||
        [input.firstName, input.lastName].filter(Boolean).join(' ') ||
        'User'
      const user: AuthUserRecord = {
        id: randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        status: 'ACTIVE',
        profile: {
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          displayName,
        },
      }
      memoryUsersById.set(user.id, user)
      memoryIdsByEmail.set(user.email, user.id)
      return user
    },
  }
}

/** Clear in-memory users (tests only). */
export function resetAuthRepositoryForTests(): void {
  memoryUsersById.clear()
  memoryIdsByEmail.clear()
}

function createSupabaseAuthRepository(config: AppConfig): AuthRepository {
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }

  return {
    async findByEmail(email) {
      const { data, error } = await client
        .from('users')
        .select('id, email, password_hash, role, is_active, name')
        .eq('email', email)
        .maybeSingle()

      if (error) throw error
      return data ? toRecord(data as UserRow) : null
    },

    async findById(id) {
      const { data, error } = await client
        .from('users')
        .select('id, email, password_hash, role, is_active, name')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data ? toRecord(data as UserRow) : null
    },

    async createUserWithProfile(input) {
      const name =
        input.name?.trim() ||
        [input.firstName, input.lastName].filter(Boolean).join(' ') ||
        'User'

      const { data, error } = await client
        .from('users')
        .insert({
          email: input.email,
          password_hash: input.passwordHash,
          role: input.role,
          name,
          email_verified: false,
          is_active: true,
        })
        .select('id, email, password_hash, role, is_active, name')
        .single()

      if (error) throw error
      return toRecord(data as UserRow)
    },
  }
}

export function createAuthRepository(config: AppConfig = loadConfig()): AuthRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseAuthRepository(config)
  }
  return createMemoryAuthRepository()
}
