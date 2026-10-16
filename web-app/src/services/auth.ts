import { apiRequest, type AuthTokens, refreshTokens } from './api'

export type AuthRole = 'super' | 'admin' | 'coordinator' | 'tutor' | 'client'

export type AuthUser = {
  id: string
  email: string
  role: AuthRole
  phone?: string | null
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

export type MessageResponse = { message: string }

export function forgotPassword(email: string) {
  return apiRequest<MessageResponse>('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuthRefresh: true,
  })
}

export function verifyResetCode(email: string, code: string) {
  return apiRequest<{ verified: true }>('/auth/password/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
    skipAuthRefresh: true,
  })
}

export function resetPassword(input: {
  email: string
  code: string
  newPassword: string
  confirmPassword: string
}) {
  return apiRequest<MessageResponse>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(input),
    skipAuthRefresh: true,
  })
}

export function resendResetCode(email: string) {
  return apiRequest<MessageResponse>('/auth/password/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuthRefresh: true,
  })
}

export type MeResponse = { user: AuthUser }

export function getMe() {
  return apiRequest<MeResponse>('/auth/me')
}

export function updateMe(input: {
  name?: string
  phone?: string | null
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}) {
  return apiRequest<MeResponse>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
