import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type {
  AccountRecord,
  CreateAccountInput,
  UpdateAccountInput,
  UserListFilter,
  UserRole,
  UserStats,
  UserStatus,
} from './users.types.js'

export type UsersRepository = {
  findMany: () => Promise<AccountRecord[]>
  findPage: (filter: UserListFilter) => Promise<{ items: AccountRecord[]; total: number }>
  countStats: () => Promise<UserStats>
  findById: (id: string) => Promise<AccountRecord | null>
  findByEmail: (email: string) => Promise<AccountRecord | null>
  createAccount: (input: CreateAccountInput) => Promise<AccountRecord>
  updateAccount: (id: string, input: UpdateAccountInput) => Promise<AccountRecord | null>
  incrementNbDone: (id: string) => Promise<void>
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

function profileFor(input: CreateAccountInput) {
  const named = splitName(displayNameFor(input))
  return {
    firstName: input.firstName ?? named.firstName,
    lastName: input.lastName ?? named.lastName,
    displayName: named.displayName,
  }
}

const EMPTY_ROLE_COUNTS: Record<UserRole, number> = {
  super: 0,
  admin: 0,
  coordinator: 0,
  tutor: 0,
  client: 0,
}

function summarize(rows: { role: UserRole; status: UserStatus }[]): UserStats {
  const byRole = { ...EMPTY_ROLE_COUNTS }
  let active = 0
  let inactive = 0
  for (const row of rows) {
    if (row.role in byRole) byRole[row.role] += 1
    if (row.status === 'ACTIVE') active += 1
    else inactive += 1
  }
  return { total: rows.length, active, inactive, byRole }
}

function matchesFilter(user: AccountRecord, filter: UserListFilter): boolean {
  if (filter.role && user.role !== filter.role) return false
  if (filter.status && user.status !== filter.status) return false
  if (filter.search) {
    const needle = filter.search.toLowerCase()
    const name = user.profile?.displayName?.toLowerCase() ?? ''
    const email = user.email.toLowerCase()
    if (!name.includes(needle) && !email.includes(needle)) return false
  }
  return true
}

function applyUpdate(user: AccountRecord, input: UpdateAccountInput): AccountRecord {
  const name = input.name?.trim()
  return {
    ...user,
    role: input.role ?? user.role,
    status: input.status ?? user.status,
    passwordHash: input.passwordHash ?? user.passwordHash,
    profile: name ? splitName(name) : user.profile,
    updatedAt: new Date().toISOString(),
  }
}

function pageOf(users: AccountRecord[], filter: UserListFilter) {
  const sorted = users
    .filter((user) => matchesFilter(user, filter))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const start = (filter.page - 1) * filter.limit
  return {
    items: sorted.slice(start, start + filter.limit),
    total: sorted.length,
  }
}

/** Drop characters that would break a PostgREST `or` filter or act as wildcards. */
function searchOr(search: string): string | null {
  const safe = search.replace(/[%_\\,()]/g, '').trim()
  if (!safe) return null
  return `email.ilike.%${safe}%,name.ilike.%${safe}%`
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

    async findPage(filter) {
      return pageOf([...memoryUsersById.values()], filter)
    },

    async countStats() {
      return summarize([...memoryUsersById.values()])
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
        profile: profileFor(input),
        createdAt: now,
        updatedAt: now,
      }
      memoryUsersById.set(user.id, user)
      memoryIdsByEmail.set(user.email, user.id)
      return user
    },

    async updateAccount(id, input) {
      const current = memoryUsersById.get(id)
      if (!current) return null
      const updated = applyUpdate(current, input)
      memoryUsersById.set(id, updated)
      return updated
    },

    async incrementNbDone(_id) {
      // nb_done not tracked on in-memory accounts
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

    async findPage(filter) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      let query = client
        .from('users')
        .select(USER_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filter.role) query = query.eq('role', filter.role)
      if (filter.status) query = query.eq('is_active', filter.status === 'ACTIVE')
      if (filter.search) {
        const clause = searchOr(filter.search)
        if (clause) query = query.or(clause)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return {
        items: (data as UserRow[]).map(toRecord),
        total: count ?? 0,
      }
    },

    async countStats() {
      const { data, error } = await client.from('users').select('role, is_active')
      if (error) throw error
      const rows = (data as { role: UserRole; is_active: boolean }[]).map((row) => ({
        role: row.role,
        status: (row.is_active ? 'ACTIVE' : 'INACTIVE') as UserStatus,
      }))
      return summarize(rows)
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

    async updateAccount(id, input) {
      const patch: {
        name?: string
        role?: UserRole
        is_active?: boolean
        password_hash?: string
      } = {}
      if (input.name !== undefined) patch.name = input.name.trim()
      if (input.role !== undefined) patch.role = input.role
      if (input.status !== undefined) patch.is_active = input.status === 'ACTIVE'
      if (input.passwordHash !== undefined) patch.password_hash = input.passwordHash

      const { data, error } = await client
        .from('users')
        .update(patch)
        .eq('id', id)
        .select(USER_COLUMNS)
        .maybeSingle()

      if (error) throw error
      return data ? toRecord(data as UserRow) : null
    },

    async incrementNbDone(id) {
      const { data, error: readError } = await client
        .from('users')
        .select('nb_done')
        .eq('id', id)
        .maybeSingle()
      if (readError) throw readError
      if (!data) return
      const current = (data as { nb_done: number }).nb_done ?? 0
      const { error } = await client.from('users').update({ nb_done: current + 1 }).eq('id', id)
      if (error) throw error
    },
  }
}

export function createUsersRepository(config: AppConfig = loadConfig()): UsersRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseUsersRepository(config)
  }
  return createMemoryUsersRepository()
}
