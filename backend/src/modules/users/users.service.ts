import type { AuthActor } from '../../authz/index.js'
import { assertSelfOrOps, isAdmin, isOps } from '../../authz/index.js'
import { conflict, forbidden, notFound } from '../../errors/app-error.js'
import { hashPassword } from '../auth/auth.tokens.js'
import { getLoggingService } from '../logging/index.js'
import type { UsersRepository } from './users.repository.js'
import type { CreateUserBody, ListUsersQuery, UpdateUserBody } from './users.schema.js'
import type { AccountRecord, CreateAccountInput, User, UserStats } from './users.types.js'
import { toPublicUser } from './users.types.js'

export type UserListResult = {
  data: User[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

export type UsersService = {
  listUsers: (query: ListUsersQuery) => Promise<UserListResult>
  getStats: () => Promise<UserStats>
  getUserById: (id: string) => Promise<User>
  /** Self or admin may read a user record. */
  assertAccessible: (id: string, actor: AuthActor) => Promise<User>
  /** Credential lookup for auth. Includes the password hash. */
  findByEmail: (email: string) => Promise<AccountRecord | null>
  findById: (id: string) => Promise<AccountRecord | null>
  createAccount: (input: CreateAccountInput) => Promise<AccountRecord>
  createUser: (input: CreateUserBody) => Promise<User>
  updateUser: (id: string, input: UpdateUserBody, actor: AuthActor) => Promise<User>
  deactivateUser: (id: string, actor: AuthActor) => Promise<User>
  /** Authenticated self-service profile updates (auth /me). */
  updateSelfProfile: (
    id: string,
    input: { name?: string; passwordHash?: string },
  ) => Promise<AccountRecord>
  /** Password reset flow after code verification. */
  updateSelfPassword: (id: string, passwordHash: string) => Promise<AccountRecord | null>
}

export function createUsersService(repository: UsersRepository): UsersService {
  async function loadOrThrow(id: string): Promise<User> {
    const account = await repository.findById(id)
    if (!account) {
      throw notFound('User not found', 'USER_NOT_FOUND')
    }
    return toPublicUser(account)
  }

  async function assertAccessible(id: string, actor: AuthActor): Promise<User> {
    const user = await loadOrThrow(id)
    assertSelfOrOps(actor, user.id)
    return user
  }

  return {
    async listUsers(query) {
      const { items, total } = await repository.findPage(query)
      return {
        data: items.map(toPublicUser),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
        },
      }
    },

    getStats() {
      return repository.countStats()
    },

    async getUserById(id) {
      return loadOrThrow(id)
    },

    assertAccessible,

    findByEmail(email) {
      return repository.findByEmail(email)
    },

    findById(id) {
      return repository.findById(id)
    },

    createAccount(input) {
      return repository.createAccount(input)
    },

    async createUser(input) {
      const existing = await repository.findByEmail(input.email)
      if (existing) {
        throw conflict('Email already registered')
      }

      const account = await repository.createAccount({
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        name: input.name,
      })
      getLoggingService().recordActivitySafe({
        action: 'users.create',
        entity: 'user',
        entityId: account.id,
        meta: { email: account.email, role: account.role },
      })
      return toPublicUser(account)
    },

    async updateUser(id, input, actor) {
      await assertAccessible(id, actor)

      const privileged = input.role !== undefined || input.status !== undefined || input.password
      if (privileged && !isAdmin(actor.roles)) {
        throw forbidden('Only admins can change role, status, or password')
      }
      if (!isAdmin(actor.roles) && isOps(actor.roles) && actor.id !== id) {
        // Coordinators may update display name only on other users.
        if (input.role !== undefined || input.status !== undefined || input.password) {
          throw forbidden('Only admins can change role, status, or password')
        }
      }
      if (actor.id === id && input.status === 'INACTIVE') {
        throw forbidden('You cannot deactivate your own account')
      }
      if (actor.id === id && input.role && !actor.roles.includes(input.role)) {
        throw forbidden('You cannot change your own role')
      }

      const updated = await repository.updateAccount(id, {
        name: input.name,
        role: input.role,
        status: input.status,
        passwordHash: input.password ? await hashPassword(input.password) : undefined,
      })
      if (!updated) {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'users.update',
        entity: 'user',
        entityId: id,
        meta: {
          role: input.role,
          status: input.status,
          nameChanged: Boolean(input.name),
          passwordChanged: Boolean(input.password),
        },
      })
      return toPublicUser(updated)
    },

    async deactivateUser(id, actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can deactivate users')
      }
      if (actor.id === id) {
        throw forbidden('You cannot deactivate your own account')
      }
      await loadOrThrow(id)
      const updated = await repository.updateAccount(id, { status: 'INACTIVE' })
      if (!updated) {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'users.deactivate',
        entity: 'user',
        entityId: id,
      })
      return toPublicUser(updated)
    },

    async updateSelfProfile(id, input) {
      const account = await repository.findById(id)
      if (!account || account.status !== 'ACTIVE') {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }
      if (input.name === undefined && input.passwordHash === undefined) {
        return account
      }
      const updated = await repository.updateAccount(id, {
        name: input.name,
        passwordHash: input.passwordHash,
      })
      if (!updated) {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }
      return updated
    },

    updateSelfPassword(id, passwordHash) {
      return repository.updateAccount(id, { passwordHash })
    },
  }
}
