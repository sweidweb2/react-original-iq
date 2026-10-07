import { describe, expect, it } from 'vitest'

import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyPassword,
  verifyRefreshToken,
} from '../../src/modules/auth/auth.tokens.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('auth.tokens', () => {
  const config = loadTestConfig()

  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('password-123')
    expect(hash).not.toBe('password-123')
    expect(await verifyPassword('password-123', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('signs and verifies access tokens', () => {
    const token = signAccessToken(config, 'user-1', 'STUDENT')
    const payload = verifyAccessToken(config, token)
    expect(payload).toMatchObject({
      sub: 'user-1',
      role: 'STUDENT',
      typ: 'access',
    })
  })

  it('signs and verifies refresh tokens', () => {
    const token = signRefreshToken(config, 'user-1', 'ADMIN')
    const payload = verifyRefreshToken(config, token)
    expect(payload).toMatchObject({
      sub: 'user-1',
      role: 'ADMIN',
      typ: 'refresh',
    })
  })

  it('rejects access token verified as refresh', () => {
    const access = signAccessToken(config, 'user-1', 'STUDENT')
    expect(() => verifyRefreshToken(config, access)).toThrow()
  })
})
