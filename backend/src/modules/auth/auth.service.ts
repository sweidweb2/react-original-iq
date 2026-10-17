import { createHash, timingSafeEqual } from 'node:crypto'

import { isSuper } from '../../authz/roles.js'
import { type AppConfig, isSupabaseConfigured } from '../../config/index.js'
import {
  conflict,
  maintenanceError,
  unauthorized,
  validationError,
} from '../../errors/app-error.js'
import { reportError } from '../../errors/report-error.js'
import { getLogger } from '../../logging/index.js'
import type { LoggingService } from '../logging/index.js'
import type { UsersService } from '../users/users.service.js'
import type { AccountRecord } from '../users/users.types.js'
import type {
  ForgotPasswordBody,
  LoginBody,
  RefreshBody,
  RegisterBody,
  ResendResetCodeBody,
  ResetPasswordBody,
  UpdateMeBody,
  VerifyResetCodeBody,
} from './auth.schema.js'
import type { RoleName } from './auth.schema.js'
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  type SessionClaims,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from './auth.tokens.js'
import type { AuthTokens, AuthUserDto, LoginResult } from './auth.types.js'
import {
  type AuthSessionRecord,
  type AuthSessionsRepository,
  createAuthSessionsRepository,
  isSessionLive,
} from './auth-sessions.repository.js'
import {
  createLoginVerificationsRepository,
  generateSixDigitCode,
  type LoginVerificationsRepository,
  PASSWORD_RESET_CODE_TTL_MS,
  PASSWORD_RESET_MAX_ATTEMPTS,
  rememberPlainCodeForTests,
} from './login-verifications.repository.js'

export const PASSWORD_RESET_ACK_MESSAGE =
  'If an account exists for this email, a reset code has been sent.'

export type PasswordResetAck = { message: string }

export type AuthService = {
  register: (input: RegisterBody) => Promise<LoginResult>
  login: (input: LoginBody) => Promise<LoginResult>
  refreshTokens: (input: RefreshBody) => Promise<AuthTokens>
  logout: (input: RefreshBody) => Promise<void>
  forgotPassword: (input: ForgotPasswordBody) => Promise<PasswordResetAck>
  verifyResetCode: (input: VerifyResetCodeBody) => Promise<{ verified: true }>
  resetPassword: (input: ResetPasswordBody) => Promise<PasswordResetAck>
  resendResetCode: (input: ResendResetCodeBody) => Promise<PasswordResetAck>
  getMe: (userId: string) => Promise<AuthUserDto>
  /** `sessionId` is the caller's session; it survives a password change, all others are revoked. */
  updateMe: (userId: string, input: UpdateMeBody, sessionId?: string) => Promise<AuthUserDto>
}

function toUserDto(user: AccountRecord): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role as RoleName,
    phone: user.phone,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          displayName: user.profile.displayName,
        }
      : null,
  }
}

function toSessionClaims(session: AuthSessionRecord): SessionClaims {
  return { id: session.id, expiresAt: new Date(session.expiresAt) }
}

function issueTokens(config: AppConfig, user: AccountRecord, session: SessionClaims): AuthTokens {
  const role = user.role as RoleName
  return {
    accessToken: signAccessToken(config, user.id, role, session),
    refreshToken: signRefreshToken(config, user.id, role, session),
  }
}

function hashResetCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function resetCodeMatches(storedHash: string, code: string): boolean {
  const expected = Buffer.from(storedHash, 'hex')
  const actual = Buffer.from(hashResetCode(code), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function shouldLogResetCode(config: AppConfig): boolean {
  return !isSupabaseConfigured(config) || config.env === 'development'
}

export type MaintenanceCheck = {
  isMaintenance: () => Promise<boolean>
}

export function createAuthService(
  users: UsersService,
  config: AppConfig,
  logging?: LoggingService,
  verifications: LoginVerificationsRepository = createLoginVerificationsRepository(config),
  sessions: AuthSessionsRepository = createAuthSessionsRepository(config),
  maintenance?: MaintenanceCheck,
): AuthService {
  /** Only SUPER may hold a session while maintenance is on. */
  async function assertAllowedDuringMaintenance(user: AccountRecord): Promise<void> {
    if (isSuper([user.role]) || !maintenance) return
    if (await maintenance.isMaintenance()) {
      throw maintenanceError()
    }
  }

  async function startSession(user: AccountRecord): Promise<AuthTokens> {
    const session = await sessions.create({
      userId: user.id,
      expiresAt: new Date(Date.now() + config.sessionTtlMs),
    })
    return issueTokens(config, user, toSessionClaims(session))
  }

  async function issuePasswordResetCode(email: string): Promise<void> {
    const user = await users.findByEmail(email)
    if (!user || user.status !== 'ACTIVE') {
      return
    }

    const code = generateSixDigitCode()
    await verifications.invalidateUnusedForUser(user.id, 'password_reset')
    const record = await verifications.create({
      userId: user.id,
      codeHash: hashResetCode(code),
      type: 'password_reset',
      expiresAt: new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS),
    })
    if (!isSupabaseConfigured(config)) {
      rememberPlainCodeForTests(record.id, code)
    }

    if (shouldLogResetCode(config)) {
      getLogger().info({ email, code, type: 'password_reset' }, 'password reset verification code')
    }
  }

  async function findActiveResetCode(email: string, code: string) {
    const user = await users.findByEmail(email)
    if (!user || user.status !== 'ACTIVE') {
      throw unauthorized('Invalid or expired reset code')
    }
    const record = await verifications.findLatestActive({
      userId: user.id,
      type: 'password_reset',
    })
    if (!record) {
      throw unauthorized('Invalid or expired reset code')
    }
    if (!resetCodeMatches(record.codeHash, code)) {
      const attempts = await verifications.registerFailedAttempt(
        record.id,
        PASSWORD_RESET_MAX_ATTEMPTS,
      )
      if (attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
        throw unauthorized('Too many wrong codes. Request a new reset code.')
      }
      throw unauthorized('Invalid or expired reset code')
    }
    return { user, record }
  }

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
        reportError(error, { source: 'auth.register.activity', meta: { userId: user.id } })
      }

      return {
        user: toUserDto(user),
        tokens: await startSession(user),
      }
    },

    async login(input) {
      const user = await users.findByEmail(input.email)
      const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
      if (!user || user.status !== 'ACTIVE' || !ok) {
        throw unauthorized('Invalid email or password')
      }

      await assertAllowedDuringMaintenance(user)

      try {
        await logging?.recordActivity({
          userId: user.id,
          action: 'auth.login',
          entity: 'user',
          entityId: user.id,
        })
      } catch (error) {
        reportError(error, { source: 'auth.login.activity', meta: { userId: user.id } })
      }

      return {
        user: toUserDto(user),
        tokens: await startSession(user),
      }
    },

    async refreshTokens(input) {
      let payload
      try {
        payload = verifyRefreshToken(config, input.refreshToken)
      } catch {
        throw unauthorized('Invalid or expired refresh token')
      }

      const session = await sessions.findById(payload.sid)
      if (!session || session.userId !== payload.sub || !isSessionLive(session)) {
        throw unauthorized('Invalid or expired refresh token')
      }

      const user = await users.findById(payload.sub)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized('Invalid or expired refresh token')
      }

      await assertAllowedDuringMaintenance(user)

      return issueTokens(config, user, toSessionClaims(session))
    },

    async logout(input) {
      let userId: string | undefined
      let sessionId: string | undefined
      try {
        const payload = verifyRefreshToken(config, input.refreshToken)
        userId = payload.sub
        sessionId = payload.sid
      } catch {
        // Expired or invalid tokens have no live session to revoke; client discards them anyway.
      }
      if (sessionId) {
        await sessions.revoke(sessionId)
      }

      try {
        await logging?.recordActivity({
          userId: userId ?? null,
          action: 'auth.logout',
          entity: 'user',
          entityId: userId ?? null,
        })
      } catch (error) {
        reportError(error, { source: 'auth.logout.activity', meta: { userId: userId ?? null } })
      }
    },

    async forgotPassword(input) {
      await issuePasswordResetCode(input.email)
      return { message: PASSWORD_RESET_ACK_MESSAGE }
    },

    async resendResetCode(input) {
      await issuePasswordResetCode(input.email)
      return { message: PASSWORD_RESET_ACK_MESSAGE }
    },

    async verifyResetCode(input) {
      await findActiveResetCode(input.email, input.code)
      return { verified: true }
    },

    async resetPassword(input) {
      const { user, record } = await findActiveResetCode(input.email, input.code)
      const passwordHash = await hashPassword(input.newPassword)
      const updated = await users.updateSelfPassword(user.id, passwordHash)
      if (!updated) {
        throw unauthorized('Invalid or expired reset code')
      }
      await verifications.markUsed(record.id)
      await sessions.revokeAllForUser(user.id)

      try {
        await logging?.recordActivity({
          userId: user.id,
          action: 'auth.password_reset',
          entity: 'user',
          entityId: user.id,
        })
      } catch (error) {
        reportError(error, { source: 'auth.password_reset.activity', meta: { userId: user.id } })
      }

      return { message: 'Password updated. You can sign in with your new password.' }
    },

    async getMe(userId) {
      const user = await users.findById(userId)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized('Invalid or expired access token')
      }
      return toUserDto(user)
    },

    async updateMe(userId, input, sessionId) {
      const user = await users.findById(userId)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized('Invalid or expired access token')
      }

      if (input.newPassword) {
        if (!input.currentPassword) {
          throw validationError('Current password is required to change password')
        }
        const ok = await verifyPassword(input.currentPassword, user.passwordHash)
        if (!ok) {
          throw unauthorized('Current password is incorrect')
        }
      }

      const updated = await users.updateSelfProfile(userId, {
        name: input.name,
        phone: input.phone,
        passwordHash: input.newPassword ? await hashPassword(input.newPassword) : undefined,
      })
      if (input.newPassword) {
        await sessions.revokeAllForUser(userId, { exceptId: sessionId })
      }

      try {
        await logging?.recordActivity({
          userId,
          action: 'auth.update_me',
          entity: 'user',
          entityId: userId,
          meta: {
            nameChanged: Boolean(input.name),
            phoneChanged: input.phone !== undefined,
            passwordChanged: Boolean(input.newPassword),
          },
        })
      } catch (error) {
        reportError(error, { source: 'auth.update_me.activity', meta: { userId } })
      }

      return toUserDto(updated)
    },
  }
}
