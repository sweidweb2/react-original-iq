import { isSupabaseConfigured, type AppConfig } from '../../config/index.js'
import { conflict, unauthorized, validationError } from '../../errors/app-error.js'
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
  createLoginVerificationsRepository,
  generateSixDigitCode,
  PASSWORD_RESET_CODE_TTL_MS,
  type LoginVerificationsRepository,
} from './login-verifications.repository.js'
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from './auth.tokens.js'
import type { AuthTokens, AuthUserDto, LoginResult } from './auth.types.js'

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
  updateMe: (userId: string, input: UpdateMeBody) => Promise<AuthUserDto>
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

function issueTokens(config: AppConfig, user: AccountRecord): AuthTokens {
  const role = user.role as RoleName
  return {
    accessToken: signAccessToken(config, user.id, role),
    refreshToken: signRefreshToken(config, user.id, role),
  }
}

function shouldLogResetCode(config: AppConfig): boolean {
  return !isSupabaseConfigured(config) || config.env === 'development'
}

export function createAuthService(
  users: UsersService,
  config: AppConfig,
  logging?: LoggingService,
  verifications: LoginVerificationsRepository = createLoginVerificationsRepository(config),
): AuthService {
  async function issuePasswordResetCode(email: string): Promise<void> {
    const user = await users.findByEmail(email)
    if (!user || user.status !== 'ACTIVE') {
      return
    }

    const code = generateSixDigitCode()
    await verifications.invalidateUnusedForUser(user.id, 'password_reset')
    await verifications.create({
      userId: user.id,
      code,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS),
    })

    if (shouldLogResetCode(config)) {
      getLogger().info({ email, code, type: 'password_reset' }, 'password reset verification code')
    }
  }

  async function findActiveResetCode(email: string, code: string) {
    const user = await users.findByEmail(email)
    if (!user || user.status !== 'ACTIVE') {
      throw unauthorized('Invalid or expired reset code')
    }
    const record = await verifications.findActive({
      userId: user.id,
      code,
      type: 'password_reset',
    })
    if (!record) {
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

      try {
        await logging?.recordActivity({
          userId: user.id,
          action: 'auth.password_reset',
          entity: 'user',
          entityId: user.id,
        })
      } catch (error) {
        getLogger().error({ err: error }, 'failed to write password reset activity')
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

    async updateMe(userId, input) {
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
        getLogger().error({ err: error }, 'failed to write update_me activity')
      }

      return toUserDto(updated)
    },
  }
}
