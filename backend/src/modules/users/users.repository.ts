import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin, selectAllPages } from '../../database/index.js'
import { ilikeAny } from '../_shared/query.js'
import type {
  AccountRecord,
  CreateAccountInput,
  UpdateAccountInput,
  User,
  UserListFilter,
  UserRole,
  UserStats,
  UserStatus,
} from './users.types.js'
import { toPublicUser } from './users.types.js'

/** List reads never carry the password hash; only single-account lookups (auth) do. */
export type UsersRepository = {
  findMany: () => Promise<User[]>
  /** Active users of one role, oldest first, without credentials. */
  findActiveByRole: (role: UserRole) => Promise<User[]>
  findPage: (filter: UserListFilter) => Promise<{ items: User[]; total: number }>
  countStats: () => Promise<UserStats>
  findById: (id: string) => Promise<AccountRecord | null>
  findByEmail: (email: string) => Promise<AccountRecord | null>
  createAccount: (input: CreateAccountInput) => Promise<AccountRecord>
  updateAccount: (id: string, input: UpdateAccountInput) => Promise<AccountRecord | null>
  deleteAccount: (id: string) => Promise<boolean>
  incrementNbDone: (id: string) => Promise<void>
}

type PublicUserRow = {
  id: string
  email: string
  role: UserRole
  is_active: boolean
  name: string
  phone: string | null
  created_at: string
  updated_at: string
}

type UserRow = PublicUserRow & {
  password_hash: string
}

const PUBLIC_USER_COLUMNS = 'id, email, role, is_active, name, phone, created_at, updated_at'
const USER_COLUMNS = `${PUBLIC_USER_COLUMNS}, password_hash`

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
    phone: input.phone !== undefined ? input.phone : user.phone,
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
    items: sorted.slice(start, start + filter.limit).map(toPublicUser),
    total: sorted.length,
  }
}

function toUser(row: PublicUserRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.is_active ? 'ACTIVE' : 'INACTIVE',
    phone: row.phone ?? null,
    profile: splitName(row.name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRecord(row: UserRow): AccountRecord {
  return { ...toUser(row), passwordHash: row.password_hash }
}

/** Shared store so seeds and createApp() see the same accounts when Supabase is off. */
const memoryUsersById = new Map<string, AccountRecord>()
const memoryIdsByEmail = new Map<string, string>()

function createMemoryUsersRepository(): UsersRepository {
  return {
    async findMany() {
      return [...memoryUsersById.values()].map(toPublicUser)
    },

    async findActiveByRole(role) {
      return [...memoryUsersById.values()]
        .filter((user) => user.role === role && user.status === 'ACTIVE')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(toPublicUser)
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
        phone: null,
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

    async deleteAccount(id) {
      const current = memoryUsersById.get(id)
      if (!current) return false
      memoryUsersById.delete(id)
      memoryIdsByEmail.delete(current.email)
      return true
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
      const rows = await selectAllPages<PublicUserRow>(() =>
        client
          .from('users')
          .select(PUBLIC_USER_COLUMNS)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }),
      )
      return rows.map(toUser)
    },

    async findActiveByRole(role) {
      const { data, error } = await client
        .from('users')
        .select(PUBLIC_USER_COLUMNS)
        .eq('role', role)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as PublicUserRow[]).map(toUser)
    },

    async findPage(filter) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      let query = client
        .from('users')
        .select(PUBLIC_USER_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filter.role) query = query.eq('role', filter.role)
      if (filter.status) query = query.eq('is_active', filter.status === 'ACTIVE')
      if (filter.search) {
        const clause = ilikeAny(['email', 'name'], filter.search)
        if (clause) query = query.or(clause)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return {
        items: (data as PublicUserRow[]).map(toUser),
        total: count ?? 0,
      }
    },

    async countStats() {
      const count = async (column?: 'role' | 'is_active', value?: string | boolean) => {
        let query = client.from('users').select('id', { count: 'exact', head: true })
        if (column) query = query.eq(column, value)
        const { count: total, error } = await query
        if (error) throw error
        return total ?? 0
      }
      const roles = Object.keys(EMPTY_ROLE_COUNTS) as UserRole[]
      const [total, active, ...roleCounts] = await Promise.all([
        count(),
        count('is_active', true),
        ...roles.map((role) => count('role', role)),
      ])
      const byRole = { ...EMPTY_ROLE_COUNTS }
      roles.forEach((role, index) => {
        byRole[role] = roleCounts[index] ?? 0
      })
      return { total, active, inactive: total - active, byRole }
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
        phone?: string | null
      } = {}
      if (input.name !== undefined) patch.name = input.name.trim()
      if (input.role !== undefined) patch.role = input.role
      if (input.status !== undefined) patch.is_active = input.status === 'ACTIVE'
      if (input.passwordHash !== undefined) patch.password_hash = input.passwordHash
      if (input.phone !== undefined) patch.phone = input.phone

      const { data, error } = await client
        .from('users')
        .update(patch)
        .eq('id', id)
        .select(USER_COLUMNS)
        .maybeSingle()

      if (error) throw error
      return data ? toRecord(data as UserRow) : null
    },

    async deleteAccount(id) {
      const { error, count } = await client.from('users').delete({ count: 'exact' }).eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },

    async incrementNbDone(id) {
      const { error } = await client.rpc('increment_user_nb_done', { p_user_id: id })
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
