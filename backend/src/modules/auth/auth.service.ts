import type { AppConfig } from '../../config/index.js'
import { conflict, unauthorized } from '../../errors/app-error.js'
import { getLogger } from '../../logging/index.js'
import type { LoggingService } from '../logging/index.js'
import type { UsersService } from '../users/users.service.js'
import type { AccountRecord } from '../users/users.types.js'
import type { LoginBody, RefreshBody, RegisterBody } from './auth.schema.js'
import type { RoleName } from './auth.schema.js'
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from './auth.tokens.js'
import type { AuthTokens, AuthUserDto, LoginResult } from './auth.types.js'

export type AuthService = {
  register: (input: RegisterBody) => Promise<LoginResult>
  login: (input: LoginBody) => Promise<LoginResult>
  refreshTokens: (input: RefreshBody) => Promise<AuthTokens>
  logout: (input: RefreshBody) => Promise<void>
}

function toUserDto(user: AccountRecord): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role as RoleName,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          displayName: user.profile.displayName,
        }
      : null,
  }
}

function issueTokens(config: AppConfig, user: AccountRecord): AuthTokens {
  const role = user.role as RoleName
  return {
    accessToken: signAccessToken(config, user.id, role),
    refreshToken: signRefreshToken(config, user.id, role),
  }
}

export function createAuthService(
  users: UsersService,
  config: AppConfig,
  logging?: LoggingService,
): AuthService {
  return {
    async register(input) {
      const existing = await users.findByEmail(input.email)
      if (existing) {
        throw conflict('Email already registered')
      }

      const passwordHash = await hashPassword(input.password)
      const user = await users.createAccount({
        email: input.email,
        passwordHash,
        role: 'client',
        firstName: input.firstName,
        lastName: input.lastName,
      })

      try {
        await logging?.recordActivity({
          userId: user.id,
          action: 'auth.register',
          entity: 'user',
          entityId: user.id,
        })
      } catch (error) {
        getLogger().error({ err: error }, 'failed to write register activity')
      }

      return {
        user: toUserDto(user),
        tokens: issueTokens(config, user),
      }
    },

    async login(input) {
      const user = await users.findByEmail(input.email)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized('Invalid email or password')
      }

      const ok = await verifyPassword(input.password, user.passwordHash)
      if (!ok) {
        throw unauthorized('Invalid email or password')
      }

      try {
        await logging?.recordActivity({
          userId: user.id,
          action: 'auth.login',
          entity: 'user',
          entityId: user.id,
        })
      } catch (error) {
        getLogger().error({ err: error }, 'failed to write login activity')
      }

      return {
        user: toUserDto(user),
        tokens: issueTokens(config, user),
      }
    },

    async refreshTokens(input) {
      let payload
      try {
        payload = verifyRefreshToken(config, input.refreshToken)
      } catch {
        throw unauthorized('Invalid or expired refresh token')
      }

      const user = await users.findById(payload.sub)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized('Invalid or expired refresh token')
      }

      return issueTokens(config, user)
    },

    async logout(input) {
      let userId: string | undefined
      try {
        const payload = verifyRefreshToken(config, input.refreshToken)
        userId = payload.sub
      } catch {
        // Client still discards tokens; logging is best-effort.
      }

      try {
        await logging?.recordActivity({
          userId: userId ?? null,
          action: 'auth.logout',
          entity: 'user',
          entityId: userId ?? null,
        })
      } catch (error) {
        getLogger().error({ err: error }, 'failed to write logout activity')
      }
    },
  }
}
