import type { AuthActor } from '../../authz/index.js'
import { assertSelfOrAdmin, isAdmin } from '../../authz/index.js'
import { forbidden, notFound, notImplemented } from '../../errors/app-error.js'
import type { UsersRepository } from './users.repository.js'
import type { CreateUserBody, UpdateUserBody } from './users.schema.js'
import type { User } from './users.types.js'

export type UsersService = {
  listUsers: () => Promise<User[]>
  getUserById: (id: string) => Promise<User>
  /** Self or admin may read a user record. */
  assertAccessible: (id: string, actor: AuthActor) => Promise<User>
  createUser: (input: CreateUserBody) => Promise<User>
  updateUser: (id: string, input: UpdateUserBody, actor: AuthActor) => Promise<User>
  deactivateUser: (id: string, actor: AuthActor) => Promise<User>
}

export function createUsersService(repository: UsersRepository): UsersService {
  async function loadOrThrow(id: string): Promise<User> {
    const user = await repository.findById(id)
    if (!user) {
      throw notFound('User not found', 'USER_NOT_FOUND')
    }
    return user
  }

  async function assertAccessible(id: string, actor: AuthActor): Promise<User> {
    const user = await loadOrThrow(id)
    assertSelfOrAdmin(actor, user.id)
    return user
  }

  return {
    async listUsers() {
      return repository.findMany()
    },
    async getUserById(id) {
      return loadOrThrow(id)
    },
    assertAccessible,
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
