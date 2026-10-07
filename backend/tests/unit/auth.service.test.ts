import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthRepository, AuthUserRecord } from '../../src/modules/auth/auth.repository.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
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
    return { sub: 'user-1', role: 'STUDENT', typ: 'refresh' as const }
  }),
}))

function makeUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hash:secret123',
    role: 'STUDENT',
    status: 'ACTIVE',
    profile: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
    },
    ...overrides,
  }
}

describe('auth.service', () => {
  const config = loadTestConfig()
  let repository: AuthRepository

  beforeEach(() => {
    repository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      createUserWithProfile: vi.fn(),
    }
  })

  it('registers a new user and returns tokens', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null)
    vi.mocked(repository.createUserWithProfile).mockResolvedValue(makeUser())

    const service = createAuthService(repository, config)
    const result = await service.register({
      email: 'user@example.com',
      password: 'secret123',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })

    expect(result.user.email).toBe('user@example.com')
    expect(result.user.role).toBe('STUDENT')
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    expect(repository.createUserWithProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        role: 'STUDENT',
      }),
    )
  })

  it('rejects duplicate email on register', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    const service = createAuthService(repository, config)

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'secret123',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' })
  })

  it('logs in with valid credentials', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    const service = createAuthService(repository, config)

    const result = await service.login({
      email: 'user@example.com',
      password: 'secret123',
    })

    expect(result.user.id).toBe('user-1')
    expect(result.tokens.accessToken).toBe('access-token')
  })

  it('rejects login with wrong password', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    const service = createAuthService(repository, config)

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' })
  })

  it('rejects login for inactive users', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser({ status: 'INACTIVE' }))
    const service = createAuthService(repository, config)

    await expect(
      service.login({ email: 'user@example.com', password: 'secret123' }),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('refreshes tokens for an active user', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser())
    const service = createAuthService(repository, config)

    const tokens = await service.refreshTokens({ refreshToken: 'good' })
    expect(tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
  })

  it('rejects invalid refresh tokens', async () => {
    const service = createAuthService(repository, config)

    await expect(service.refreshTokens({ refreshToken: 'bad' })).rejects.toMatchObject({
      status: 401,
    })
  })

  it('logout resolves without error', async () => {
    const service = createAuthService(repository, config)
    await expect(service.logout({ refreshToken: 'anything' })).resolves.toBeUndefined()
  })
})
