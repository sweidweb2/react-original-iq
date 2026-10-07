import { randomUUID } from 'node:crypto'

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
}

export type AuthRepository = {
  findByEmail: (email: string) => Promise<AuthUserRecord | null>
  findById: (id: string) => Promise<AuthUserRecord | null>
  createUserWithProfile: (input: CreateAuthUserInput) => Promise<AuthUserRecord>
}

/**
 * In-memory auth store for local scaffolding.
 * Replace with a Supabase-backed repository once remote tables are ready.
 */
const usersById = new Map<string, AuthUserRecord>()
const idsByEmail = new Map<string, string>()

export function createAuthRepository(): AuthRepository {
  return {
    async findByEmail(email) {
      const id = idsByEmail.get(email)
      return id ? (usersById.get(id) ?? null) : null
    },

    async findById(id) {
      return usersById.get(id) ?? null
    },

    async createUserWithProfile(input) {
      const displayName = [input.firstName, input.lastName].filter(Boolean).join(' ') || null
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
      usersById.set(user.id, user)
      idsByEmail.set(user.email, user.id)
      return user
    },
  }
}

/** Clear in-memory users (tests only). */
export function resetAuthRepositoryForTests(): void {
  usersById.clear()
  idsByEmail.clear()
}
