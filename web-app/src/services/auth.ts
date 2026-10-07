import { apiRequest, refreshTokens, type AuthTokens } from './api'

export type AuthRole = 'SUPER' | 'ADMIN' | 'TUTOR' | 'STUDENT'

export type AuthUser = {
  id: string
  email: string
  role: AuthRole
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
  } | null
}

export type { AuthTokens }

export type AuthResponse = {
  user: AuthUser
  tokens: AuthTokens
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuthRefresh: true,
  })
}

export function register(input: {
  email: string
  password: string
  firstName?: string
  lastName?: string
}) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
    skipAuthRefresh: true,
  })
}

export function refresh(refreshToken: string) {
  return refreshTokens(refreshToken)
}

export function logout(refreshToken: string) {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
    skipAuthRefresh: true,
  })
}
