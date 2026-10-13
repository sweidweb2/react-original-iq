import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type { AccountRecord, CreateAccountInput, UserRole } from './users.types.js'

export type UsersRepository = {
  findMany: () => Promise<AccountRecord[]>
  findById: (id: string) => Promise<AccountRecord | null>
  findByEmail: (email: string) => Promise<AccountRecord | null>
  createAccount: (input: CreateAccountInput) => Promise<AccountRecord>
}

type UserRow = {
  id: string
  email: string
  password_hash: string
  role: UserRole
  is_active: boolean
  name: string
  created_at: string
  updated_at: string
}

const USER_COLUMNS = 'id, email, password_hash, role, is_active, name, created_at, updated_at'

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

function displayNameFor(input: CreateAccountInput): string {
  return input.name?.trim() || [input.firstName, input.lastName].filter(Boolean).join(' ') || 'User'
}

function toRecord(row: UserRow): AccountRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.is_active ? 'ACTIVE' : 'INACTIVE',
    profile: splitName(row.name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Shared store so seeds and createApp() see the same accounts when Supabase is off. */
const memoryUsersById = new Map<string, AccountRecord>()
const memoryIdsByEmail = new Map<string, string>()

function createMemoryUsersRepository(): UsersRepository {
  return {
    async findMany() {
      return [...memoryUsersById.values()]
    },

    async findById(id) {
      return memoryUsersById.get(id) ?? null
    },

    async findByEmail(email) {
      const id = memoryIdsByEmail.get(email)
      return id ? (memoryUsersById.get(id) ?? null) : null
    },

    async createAccount(input) {
      const now = new Date().toISOString()
      const user: AccountRecord = {
        id: randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        status: 'ACTIVE',
        profile: {
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          displayName: displayNameFor(input),
        },
        createdAt: now,
        updatedAt: now,
      }
      memoryUsersById.set(user.id, user)
      memoryIdsByEmail.set(user.email, user.id)
      return user
    },
  }
}

/** Clear in-memory accounts (tests only). */
export function resetUsersRepositoryForTests(): void {
  memoryUsersById.clear()
  memoryIdsByEmail.clear()
}

function createSupabaseUsersRepository(config: AppConfig): UsersRepository {
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }

  return {
    async findMany() {
      const { data, error } = await client
        .from('users')
        .select(USER_COLUMNS)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data as UserRow[]).map(toRecord)
    },

    async findById(id) {
      const { data, error } = await client
        .from('users')
        .select(USER_COLUMNS)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data ? toRecord(data as UserRow) : null
    },

    async findByEmail(email) {
      const { data, error } = await client
        .from('users')
        .select(USER_COLUMNS)
        .eq('email', email)
        .maybeSingle()

      if (error) throw error
      return data ? toRecord(data as UserRow) : null
    },

    async createAccount(input) {
      const { data, error } = await client
        .from('users')
        .insert({
          email: input.email,
          password_hash: input.passwordHash,
          role: input.role,
          name: displayNameFor(input),
          email_verified: false,
          is_active: true,
        })
        .select(USER_COLUMNS)
        .single()

      if (error) throw error
      return toRecord(data as UserRow)
    },
  }
}

export function createUsersRepository(config: AppConfig = loadConfig()): UsersRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseUsersRepository(config)
  }
  return createMemoryUsersRepository()
}
