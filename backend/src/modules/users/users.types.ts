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
