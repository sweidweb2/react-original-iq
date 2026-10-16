import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAuthService } from '../../src/modules/auth/auth.service.js'
import type { UsersService } from '../../src/modules/users/users.service.js'
import type { AccountRecord } from '../../src/modules/users/users.types.js'
import { loadTestConfig } from '../helpers/test-config.js'

vi.mock('../../src/modules/auth/auth.tokens.js', () => ({
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
  verifyPassword: vi.fn(
    async (password: string, passwordHash: string) => passwordHash === `hash:${password}`,
  ),
  signAccessToken: vi.fn(() => 'access-token'),
  signRefreshToken: vi.fn(() => 'refresh-token'),
  verifyRefreshToken: vi.fn((_config: unknown, token: string) => {
    if (token === 'bad') throw new Error('invalid')
    return { sub: 'user-1', role: 'client', typ: 'refresh' as const }
  }),
}))

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

  beforeEach(() => {
    users = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      createAccount: vi.fn(),
    } as unknown as UsersService
  })

  it('registers a new user and returns tokens', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(null)
    vi.mocked(users.createAccount).mockResolvedValue(makeUser())

    const service = createAuthService(users, config)
    const result = await service.register({
      email: 'user@example.com',
      password: 'secret123',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })

    expect(result.user.email).toBe('user@example.com')
    expect(result.user.role).toBe('client')
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    expect(users.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        role: 'client',
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

  it('rejects login for inactive users', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(makeUser({ status: 'INACTIVE' }))
    const service = createAuthService(users, config)

    await expect(
      service.login({ email: 'user@example.com', password: 'secret123' }),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('refreshes tokens for an active user', async () => {
    vi.mocked(users.findById).mockResolvedValue(makeUser())
    const service = createAuthService(users, config)

    const tokens = await service.refreshTokens({ refreshToken: 'good' })
    expect(tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
  })

  it('rejects invalid refresh tokens', async () => {
    const service = createAuthService(users, config)

    await expect(service.refreshTokens({ refreshToken: 'bad' })).rejects.toMatchObject({
      status: 401,
    })
  })

  it('logout resolves without error', async () => {
    const service = createAuthService(users, config)
    await expect(service.logout({ refreshToken: 'anything' })).resolves.toBeUndefined()
  })
})
