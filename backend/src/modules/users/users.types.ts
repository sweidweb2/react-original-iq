export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type UserRole = 'super' | 'admin' | 'coordinator' | 'tutor' | 'client'

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
  phone: string | null
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
  phone?: string | null
}

export type UpdateAccountInput = {
  name?: string
  role?: UserRole
  status?: UserStatus
  passwordHash?: string
  phone?: string | null
}

export type UserListFilter = {
  page: number
  limit: number
  search?: string
  role?: UserRole
  status?: UserStatus
}

export type UserStats = {
  total: number
  active: number
  inactive: number
  byRole: Record<UserRole, number>
}

export function toPublicUser(account: AccountRecord): User {
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    status: account.status,
    phone: account.phone,
    profile: account.profile,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}
