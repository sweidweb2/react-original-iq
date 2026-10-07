import type { CreateUserBody, UpdateUserBody } from './users.schema.js'
import type { User } from './users.types.js'

export type UsersRepository = {
  findMany: () => Promise<User[]>
  findById: (id: string) => Promise<User | null>
  create: (input: CreateUserBody) => Promise<User>
  update: (id: string, input: UpdateUserBody) => Promise<User>
}

export function createUsersRepository(): UsersRepository {
  return {
    async findMany() {
      return []
    },
    async findById() {
      return null
    },
    async create() {
      throw new Error('users.repository.create requires Supabase tables')
    },
    async update() {
      throw new Error('users.repository.update requires Supabase tables')
    },
  }
}
