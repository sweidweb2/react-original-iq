export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type UserRole = 'admin' | 'coordinator' | 'tutor' | 'client'

export type UserProfile = {
  firstName: string | null
  lastName: string | null
  displayName: string | null
}

export type User = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  profile: UserProfile | null
  createdAt: string
  updatedAt: string
}

/** User row including the password hash. Auth uses this. HTTP responses use `User`. */
export type AccountRecord = User & {
  passwordHash: string
}

export type CreateAccountInput = {
  email: string
  passwordHash: string
  role: UserRole
  firstName?: string
  lastName?: string
  name?: string
}

export function toPublicUser(account: AccountRecord): User {
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    status: account.status,
    profile: account.profile,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}
