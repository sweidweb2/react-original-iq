import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { verifyPassword } from '../../src/modules/auth/auth.tokens.js'
import {
  type AuthSessionsRepository,
  createAuthSessionsRepository,
  resetAuthSessionsRepositoryForTests,
} from '../../src/modules/auth/auth-sessions.repository.js'
import {
  createLoginVerificationsRepository,
  getPasswordResetCodeForTests,
  type LoginVerificationsRepository,
  resetLoginVerificationsRepositoryForTests,
} from '../../src/modules/auth/login-verifications.repository.js'
import type { UsersService } from '../../src/modules/users/users.service.js'
import type { AccountRecord } from '../../src/modules/users/users.types.js'
import { loadTestConfig } from '../helpers/test-config.js'

vi.mock('../../src/modules/auth/auth.tokens.js', () => ({
  DUMMY_PASSWORD_HASH: 'dummy-hash',
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
  verifyPassword: vi.fn(
    async (password: string, passwordHash: string) => passwordHash === `hash:${password}`,
  ),
  signAccessToken: vi.fn(() => 'access-token'),
  signRefreshToken: vi.fn(
    (_config: unknown, _userId: string, _role: string, session: { id: string }) =>
      `refresh:${session.id}`,
  ),
  verifyRefreshToken: vi.fn((_config: unknown, token: string) => {
    if (!token.startsWith('refresh:')) throw new Error('invalid')
    return {
      sub: 'user-1',
      role: 'client',
      typ: 'refresh' as const,
      sid: token.slice('refresh:'.length),
    }
  }),
}))

const SEVEN_DAYS_MS = 7 * 86_400_000

function makeUser(overrides: Partial<AccountRecord> = {}): AccountRecord {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hash:secret123',
    role: 'client',
    status: 'ACTIVE',
    phone: null,
    profile: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('auth.service', () => {
  const config = loadTestConfig()
  let users: UsersService
  let sessions: AuthSessionsRepository

  beforeEach(() => {
    resetAuthSessionsRepositoryForTests()
    resetLoginVerificationsRepositoryForTests()
    sessions = createAuthSessionsRepository(config)
    users = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      createAccount: vi.fn(),
      updateSelfProfile: vi.fn(),
      updateSelfPassword: vi.fn(),
    } as unknown as UsersService
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function serviceWithSessions(verifications?: LoginVerificationsRepository) {
    return createAuthService(users, config, undefined, verifications, sessions)
  }

  async function loginAsUser() {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
    vi.mocked(users.findById).mockResolvedValue(makeUser())
    const service = serviceWithSessions()
    const { tokens } = await service.login({ email: 'user@example.com', password: 'secret123' })
    return { service, refreshToken: tokens.refreshToken }
  }

  it('registers a new user and returns tokens', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(null)
    vi.mocked(users.createAccount).mockResolvedValue(makeUser())

    const service = createAuthService(users, config)
    const result = await service.register({
      email: 'user@example.com',
      password: 'secret123',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+96170123456',
    })

    expect(result.user.email).toBe('user@example.com')
    expect(result.user.role).toBe('client')
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: expect.stringMatching(/^refresh:/),
    })
    expect(users.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        role: 'client',
        phone: '+96170123456',
      }),
    )
  })

  it('rejects duplicate email on register', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
    const service = createAuthService(users, config)

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'secret123',
        phone: '+96170123456',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' })
  })

  it('logs in with valid credentials', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
    const service = createAuthService(users, config)

    const result = await service.login({
      email: 'user@example.com',
      password: 'secret123',
    })

    expect(result.user.id).toBe('user-1')
    expect(result.tokens.accessToken).toBe('access-token')
  })

  it('rejects login with wrong password', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
    const service = createAuthService(users, config)

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' })
  })

  it('still runs a password check when the email is unknown', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(null)
    vi.mocked(verifyPassword).mockClear()
    const service = createAuthService(users, config)

    await expect(
      service.login({ email: 'nobody@example.com', password: 'secret123' }),
    ).rejects.toMatchObject({ status: 401, message: 'Invalid email or password' })
    expect(verifyPassword).toHaveBeenCalledWith('secret123', 'dummy-hash')
  })

  it('rejects login for inactive users', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser({ status: 'INACTIVE' }))
    const service = createAuthService(users, config)

    await expect(
      service.login({ email: 'user@example.com', password: 'secret123' }),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('refreshes tokens within the same session', async () => {
    const { service, refreshToken } = await loginAsUser()

    const tokens = await service.refreshTokens({ refreshToken })
    expect(tokens).toEqual({ accessToken: 'access-token', refreshToken })
  })

  it('rejects invalid refresh tokens', async () => {
    const service = serviceWithSessions()

    await expect(service.refreshTokens({ refreshToken: 'bad' })).rejects.toMatchObject({
      status: 401,
    })
  })

  it('rejects refresh tokens whose session does not exist', async () => {
    vi.mocked(users.findById).mockResolvedValue(makeUser())
    const service = serviceWithSessions()

    await expect(
      service.refreshTokens({ refreshToken: 'refresh:unknown-session' }),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('ends the session 7 days after sign-in, even if refreshed in between', async () => {
    vi.useFakeTimers()
    const { service, refreshToken } = await loginAsUser()

    vi.advanceTimersByTime(SEVEN_DAYS_MS - 60_000)
    await expect(service.refreshTokens({ refreshToken })).resolves.toBeDefined()

    vi.advanceTimersByTime(120_000)
    await expect(service.refreshTokens({ refreshToken })).rejects.toMatchObject({ status: 401 })
  })

  it('logout revokes the session so its refresh token stops working', async () => {
    const { service, refreshToken } = await loginAsUser()

    await expect(service.logout({ refreshToken })).resolves.toBeUndefined()
    await expect(service.refreshTokens({ refreshToken })).rejects.toMatchObject({ status: 401 })
  })

  it('logout ignores invalid tokens', async () => {
    const service = serviceWithSessions()
    await expect(service.logout({ refreshToken: 'anything' })).resolves.toBeUndefined()
  })

  function resetInput(code: string) {
    return {
      email: 'user@example.com',
      code,
      newPassword: 'newpass99',
      confirmPassword: 'newpass99',
    }
  }

  function wrongCode(code: string): string {
    return code === '000000' ? '111111' : '000000'
  }

  it('password reset signs the user out of every session', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
    vi.mocked(users.findById).mockResolvedValue(makeUser())
    vi.mocked(users.updateSelfPassword).mockResolvedValue(makeUser())
    const service = serviceWithSessions(createLoginVerificationsRepository(config))
    const first = await service.login({ email: 'user@example.com', password: 'secret123' })
    const second = await service.login({ email: 'user@example.com', password: 'secret123' })

    await service.forgotPassword({ email: 'user@example.com' })
    await service.resetPassword(resetInput(getPasswordResetCodeForTests('user-1')!))

    for (const { tokens } of [first, second]) {
      await expect(
        service.refreshTokens({ refreshToken: tokens.refreshToken }),
      ).rejects.toMatchObject({ status: 401 })
    }
  })

  it('stores only a hash of the reset code', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
    const verifications = createLoginVerificationsRepository(config)
    const service = serviceWithSessions(verifications)

    await service.forgotPassword({ email: 'user@example.com' })
    const code = getPasswordResetCodeForTests('user-1')!
    const record = await verifications.findLatestActive({
      userId: 'user-1',
      type: 'password_reset',
    })
    expect(record?.codeHash).toMatch(/^[0-9a-f]{64}$/)
    expect(record?.codeHash).not.toBe(code)
  })

  it('burns the reset code after 5 wrong guesses, even if the right code comes next', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
    vi.mocked(users.updateSelfPassword).mockResolvedValue(makeUser())
    const service = serviceWithSessions(createLoginVerificationsRepository(config))

    await service.forgotPassword({ email: 'user@example.com' })
    const code = getPasswordResetCodeForTests('user-1')!
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(
        service.verifyResetCode({ email: 'user@example.com', code: wrongCode(code) }),
      ).rejects.toMatchObject({ status: 401, message: 'Invalid or expired reset code' })
    }
    await expect(
      service.verifyResetCode({ email: 'user@example.com', code: wrongCode(code) }),
    ).rejects.toMatchObject({ status: 401, message: expect.stringContaining('Too many') })

    await expect(service.resetPassword(resetInput(code))).rejects.toMatchObject({ status: 401 })
    expect(users.updateSelfPassword).not.toHaveBeenCalled()
  })

  it('changing password keeps the current session and ends the others', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
    vi.mocked(users.findById).mockResolvedValue(makeUser())
    vi.mocked(users.updateSelfProfile).mockResolvedValue(makeUser())
    const service = serviceWithSessions()
    const current = await service.login({ email: 'user@example.com', password: 'secret123' })
    const other = await service.login({ email: 'user@example.com', password: 'secret123' })
    const currentSessionId = current.tokens.refreshToken.slice('refresh:'.length)

    await service.updateMe(
      'user-1',
      {
        phone: undefined,
        currentPassword: 'secret123',
        newPassword: 'newpass99',
        confirmPassword: 'newpass99',
      },
      currentSessionId,
    )

    await expect(
      service.refreshTokens({ refreshToken: current.tokens.refreshToken }),
    ).resolves.toBeDefined()
    await expect(
      service.refreshTokens({ refreshToken: other.tokens.refreshToken }),
    ).rejects.toMatchObject({ status: 401 })
  })

  describe('maintenance mode', () => {
    let maintenanceOn = false
    const maintenance = { isMaintenance: async () => maintenanceOn }

    beforeEach(() => {
      maintenanceOn = false
    })

    function maintenanceService() {
      return createAuthService(users, config, undefined, undefined, sessions, maintenance)
    }

    it('rejects non-SUPER login with 503 after the password check', async () => {
      vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
      maintenanceOn = true
      const service = maintenanceService()

      await expect(
        service.login({ email: 'user@example.com', password: 'secret123' }),
      ).rejects.toMatchObject({ status: 503, code: 'MAINTENANCE_MODE' })
      await expect(
        service.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toMatchObject({ status: 401 })
    })

    it('still lets SUPER sign in', async () => {
      vi.mocked(users.findByEmail).mockResolvedValue(makeUser({ role: 'super' }))
      maintenanceOn = true

      const result = await maintenanceService().login({
        email: 'user@example.com',
        password: 'secret123',
      })
      expect(result.user.role).toBe('super')
    })

    it('rejects non-SUPER refresh while maintenance is on', async () => {
      vi.mocked(users.findByEmail).mockResolvedValue(makeUser())
      vi.mocked(users.findById).mockResolvedValue(makeUser())
      const service = maintenanceService()
      const { tokens } = await service.login({ email: 'user@example.com', password: 'secret123' })

      maintenanceOn = true
      await expect(
        service.refreshTokens({ refreshToken: tokens.refreshToken }),
      ).rejects.toMatchObject({ status: 503, code: 'MAINTENANCE_MODE' })

      maintenanceOn = false
      await expect(
        service.refreshTokens({ refreshToken: tokens.refreshToken }),
      ).resolves.toBeDefined()
    })
  })
})
