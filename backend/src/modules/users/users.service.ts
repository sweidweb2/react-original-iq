import type { AuthActor } from '../../authz/index.js'
import { assertSelfOrAdmin, isAdmin } from '../../authz/index.js'
import { forbidden, notFound, notImplemented } from '../../errors/app-error.js'
import type { UsersRepository } from './users.repository.js'
import type { CreateUserBody, UpdateUserBody } from './users.schema.js'
import type { AccountRecord, CreateAccountInput, User } from './users.types.js'
import { toPublicUser } from './users.types.js'

export type UsersService = {
  listUsers: () => Promise<User[]>
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
    assertSelfOrAdmin(actor, user.id)
    return user
  }

  return {
    async listUsers() {
      const accounts = await repository.findMany()
      return accounts.map(toPublicUser)
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
    async createUser() {
      throw notImplemented('users.createUser')
    },
    async updateUser(id, _input, actor) {
      await assertAccessible(id, actor)
      throw notImplemented('users.updateUser')
    },
    async deactivateUser(id, actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can deactivate users')
      }
      await loadOrThrow(id)
      throw notImplemented('users.deactivateUser')
    },
  }
}
