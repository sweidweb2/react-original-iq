import { apiRequest } from './api'
import type { AuthRole } from './auth'

export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type ManagedUser = {
  id: string
  email: string
  role: AuthRole
  status: UserStatus
  phone?: string | null
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
  } | null
  createdAt: string
  updatedAt: string
}

export type UserListMeta = {
  page: number
  limit: number
  total: number
}

export type UserStats = {
  total: number
  active: number
  inactive: number
  byRole: Record<AuthRole, number>
}

export type UserListQuery = {
  page: number
  limit: number
  search?: string
  role?: AuthRole
  status?: UserStatus
}

export type CreateUserInput = {
  name: string
  email: string
  password: string
  role: AuthRole
}

export type UpdateUserInput = {
  name?: string
  role?: AuthRole
  status?: UserStatus
  password?: string
}

/** Real name from the profile, or `''`. Use this to pre-fill name inputs. */
export function profileName(user: Pick<ManagedUser, 'profile'> | null | undefined): string {
  return (
    user?.profile?.displayName?.trim() ||
    [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ').trim() ||
    ''
  )
}

/** Display-only label; falls back to the email, so never use it to pre-fill a name field. */
export function userDisplayName(user: Pick<ManagedUser, 'email' | 'profile'>): string {
  return profileName(user) || user.email
}

export function listUsers(query: UserListQuery) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.role) params.set('role', query.role)
  if (query.status) params.set('status', query.status)
  return apiRequest<{ data: ManagedUser[]; meta: UserListMeta }>(`/users?${params.toString()}`)
}

export function getUserStats() {
  return apiRequest<UserStats>('/users/stats')
}

export function getUser(id: string) {
  return apiRequest<ManagedUser>(`/users/${id}`)
}

export function createUser(input: CreateUserInput) {
  return apiRequest<ManagedUser>('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateUser(id: string, input: UpdateUserInput) {
  return apiRequest<ManagedUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deactivateUser(id: string) {
  return apiRequest<ManagedUser>(`/users/${id}/deactivate`, {
    method: 'POST',
  })
}

export function deleteUser(id: string) {
  return apiRequest<void>(`/users/${id}`, { method: 'DELETE' })
}
