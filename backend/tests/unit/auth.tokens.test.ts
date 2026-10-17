import jwt from 'jsonwebtoken'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyPassword,
  verifyRefreshToken,
} from '../../src/modules/auth/auth.tokens.js'
import { loadTestConfig } from '../helpers/test-config.js'

const DAY_MS = 86_400_000

describe('auth.tokens', () => {
  const config = loadTestConfig()

  afterEach(() => {
    vi.useRealTimers()
  })

  function sessionEndingIn(ms: number) {
    return { id: 'session-1', expiresAt: new Date(Date.now() + ms) }
  }

  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('password-123')
    expect(hash).not.toBe('password-123')
    expect(await verifyPassword('password-123', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('signs and verifies access tokens', () => {
    const token = signAccessToken(config, 'user-1', 'client')
    const payload = verifyAccessToken(config, token)
    expect(payload).toMatchObject({
      sub: 'user-1',
      role: 'client',
      typ: 'access',
    })
  })

  it('signs and verifies refresh tokens bound to a session', () => {
    const token = signRefreshToken(config, 'user-1', 'admin', sessionEndingIn(7 * DAY_MS))
    const payload = verifyRefreshToken(config, token)
    expect(payload).toMatchObject({
      sub: 'user-1',
      role: 'admin',
      typ: 'refresh',
      sid: 'session-1',
    })
  })

  it('rejects access token verified as refresh', () => {
    const access = signAccessToken(config, 'user-1', 'client')
    expect(() => verifyRefreshToken(config, access)).toThrow()
  })

  it('expires the refresh token exactly at the session end', () => {
    vi.useFakeTimers()
    const session = sessionEndingIn(7 * DAY_MS)
    const token = signRefreshToken(config, 'user-1', 'client', session)
    const { exp } = jwt.decode(token) as { exp: number }
    expect(exp).toBe(Math.floor(session.expiresAt.getTime() / 1000))

    vi.setSystemTime(session.expiresAt.getTime() - 1000)
    expect(() => verifyRefreshToken(config, token)).not.toThrow()

    vi.setSystemTime(session.expiresAt.getTime() + 1000)
    expect(() => verifyRefreshToken(config, token)).toThrow()
  })

  it('never lets an access token outlive its session', () => {
    const session = sessionEndingIn(60_000)
    const token = signAccessToken(config, 'user-1', 'client', session)
    const { exp, sid } = jwt.decode(token) as { exp: number; sid: string }
    expect(sid).toBe('session-1')
    expect(exp).toBe(Math.floor(session.expiresAt.getTime() / 1000))
  })
})
