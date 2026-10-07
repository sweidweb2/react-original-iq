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
  profile: AuthProfileDto | null
}

export type LoginResult = {
  user: AuthUserDto
  tokens: AuthTokens
}
