import type { AuthActor } from '../../authz/index.js'
import { assertCanManageRole, assertPermission, assertSelfOrUserViewer } from '../../authz/index.js'
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
  /** Self, or anyone with `view_users`, may read a user record. */
  assertAccessible: (id: string, actor: AuthActor) => Promise<User>
  /** Credential lookup for auth. Includes the password hash. */
  findByEmail: (email: string) => Promise<AccountRecord | null>
  findById: (id: string) => Promise<AccountRecord | null>
  createAccount: (input: CreateAccountInput) => Promise<AccountRecord>
  createUser: (input: CreateUserBody, actor: AuthActor) => Promise<User>
  updateUser: (id: string, input: UpdateUserBody, actor: AuthActor) => Promise<User>
  deactivateUser: (id: string, actor: AuthActor) => Promise<User>
  deleteUser: (id: string, actor: AuthActor) => Promise<void>
  /** Authenticated self-service profile updates (auth /me). */
  updateSelfProfile: (
    id: string,
    input: { name?: string; passwordHash?: string; phone?: string | null },
  ) => Promise<AccountRecord>
  /** Password reset flow after code verification. */
  updateSelfPassword: (id: string, passwordHash: string) => Promise<AccountRecord | null>
}

/** Task-side lookups the hard-delete rule needs; structurally satisfied by the tasks repository. */
export type UserTasksPort = {
  countActiveInvolvingUser: (userId: string) => Promise<number>
  hasPaymentsForClient: (clientId: string) => Promise<boolean>
  deleteForClient: (clientId: string) => Promise<number>
}

export type UsersServiceDeps = {
  tasks?: UserTasksPort
  /** Sign the user out everywhere (password reset by an admin, deactivation). */
  revokeSessions?: (userId: string) => Promise<void>
}

export function createUsersService(
  repository: UsersRepository,
  deps: UsersServiceDeps = {},
): UsersService {
  async function loadOrThrow(id: string): Promise<User> {
    const account = await repository.findById(id)
    if (!account) {
      throw notFound('User not found', 'USER_NOT_FOUND')
    }
    return toPublicUser(account)
  }

  async function assertAccessible(id: string, actor: AuthActor): Promise<User> {
    const user = await loadOrThrow(id)
    assertSelfOrUserViewer(actor, user.id)
    return user
  }

  async function prepareTasksForDelete(userId: string): Promise<void> {
    const tasks = deps.tasks
    if (!tasks) return
    if ((await tasks.countActiveInvolvingUser(userId)) > 0) {
      throw conflict('User still has active tasks and cannot be deleted')
    }
    if (await tasks.hasPaymentsForClient(userId)) {
      throw conflict('User has tasks with payments or refunds and cannot be deleted')
    }
    // tasks.client_id is ON DELETE RESTRICT, so the account delete needs these gone first.
    await tasks.deleteForClient(userId)
  }

  return {
    async listUsers(query) {
      const { items, total } = await repository.findPage(query)
      return {
        data: items,
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

    async createUser(input, actor) {
      assertPermission(actor, 'create_users', 'You cannot create users')
      assertCanManageRole(actor, input.role)

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
        userId: actor.id,
        action: 'users.create',
        entity: 'user',
        entityId: account.id,
        meta: { email: account.email, role: account.role },
      })
      return toPublicUser(account)
    },

    async updateUser(id, input, actor) {
      const target = await assertAccessible(id, actor)
      const self = actor.id === id
      if (!self) {
        assertPermission(actor, 'manage_users', 'You cannot edit other users')
        assertCanManageRole(actor, target.role)
      }
      if (input.role !== undefined && input.role !== target.role) {
        if (self) throw forbidden('You cannot change your own role')
        assertPermission(actor, 'change_user_roles', 'You cannot change user roles')
        assertCanManageRole(actor, input.role)
      }
      if (input.status !== undefined && input.status !== target.status) {
        if (self) throw forbidden('You cannot change your own account status')
        assertPermission(actor, 'activate_users', 'You cannot activate or deactivate users')
      }
      if (input.password) {
        assertPermission(actor, 'reset_user_passwords', 'You cannot reset passwords here')
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
      if (actor.id !== id && (input.password || input.status === 'INACTIVE')) {
        await deps.revokeSessions?.(id)
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
      assertPermission(actor, 'activate_users', 'You cannot deactivate users')
      if (actor.id === id) {
        throw forbidden('You cannot deactivate your own account')
      }
      const target = await loadOrThrow(id)
      assertCanManageRole(actor, target.role)
      const updated = await repository.updateAccount(id, { status: 'INACTIVE' })
      if (!updated) {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }
      await deps.revokeSessions?.(id)
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'users.deactivate',
        entity: 'user',
        entityId: id,
      })
      return toPublicUser(updated)
    },

    async deleteUser(id, actor) {
      if (actor.id === id) {
        throw forbidden('You cannot delete your own account')
      }
      const target = await loadOrThrow(id)
      assertPermission(actor, 'delete_users', 'You cannot delete users')
      assertCanManageRole(actor, target.role)
      await prepareTasksForDelete(id)
      const deleted = await repository.deleteAccount(id)
      if (!deleted) {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'users.delete',
        entity: 'user',
        entityId: id,
      })
    },

    async updateSelfProfile(id, input) {
      const account = await repository.findById(id)
      if (!account || account.status !== 'ACTIVE') {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }
      if (
        input.name === undefined &&
        input.passwordHash === undefined &&
        input.phone === undefined
      ) {
        return account
      }
      const updated = await repository.updateAccount(id, {
        name: input.name,
        passwordHash: input.passwordHash,
        phone: input.phone,
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
