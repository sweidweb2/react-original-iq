import type { RoleName } from './auth.schema.js'

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthProfileDto = {
  firstName: string | null
  lastName: string | null
  displayName: string | null
}

export type AuthUserDto = {
  id: string
  email: string
  role: RoleName
  /** Effective permission keys (role grants plus direct grants). */
  permissions: string[]
  phone: string | null
  profile: AuthProfileDto | null
}

export type LoginResult = {
  user: AuthUserDto
  tokens: AuthTokens
}
