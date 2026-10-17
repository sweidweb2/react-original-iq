import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { permissionKeysForRole } from '../../src/authz/index.js'
import type { AppConfig } from '../../src/config/index.js'
import { errorHandler } from '../../src/errors/error.middleware.js'
import { createAuthenticate } from '../../src/middleware/authenticate.js'
import { signAccessToken, signRefreshToken } from '../../src/modules/auth/auth.tokens.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('authenticate middleware', () => {
  const config = loadTestConfig()

  function protectedApp(appConfig: AppConfig = config) {
    const app = express()
    app.get('/protected', createAuthenticate(appConfig), (req, res) => {
      res.status(200).json({ user: req.user })
    })
    app.use(errorHandler)
    return app
  }

  it('rejects missing Authorization header', async () => {
    const res = await request(protectedApp()).get('/protected')
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('rejects invalid Bearer token', async () => {
    const res = await request(protectedApp())
      .get('/protected')
      .set('Authorization', 'Bearer not-a-jwt')
    expect(res.status).toBe(401)
  })

  it('rejects expired access tokens', async () => {
    const expired = jwt.sign(
      { sub: 'user-1', role: 'admin', typ: 'access', exp: Math.floor(Date.now() / 1000) - 60 },
      config.jwtAccessSecret!,
    )
    const res = await request(protectedApp())
      .get('/protected')
      .set('Authorization', `Bearer ${expired}`)
    expect(res.status).toBe(401)
  })

  it('rejects refresh token used as access token', async () => {
    const refresh = signRefreshToken(config, 'user-1', 'client', {
      id: 'session-1',
      expiresAt: new Date(Date.now() + 60_000),
    })
    const res = await request(protectedApp())
      .get('/protected')
      .set('Authorization', `Bearer ${refresh}`)
    expect(res.status).toBe(401)
  })

  it('reports missing JWT secrets as a server error, not 401', async () => {
    const access = signAccessToken(config, 'user-1', 'admin')
    const misconfigured = { ...config, jwtAccessSecret: undefined }
    const res = await request(protectedApp(misconfigured))
      .get('/protected')
      .set('Authorization', `Bearer ${access}`)
    expect(res.status).toBe(500)
  })

  it('attaches req.user for a valid access token', async () => {
    const access = signAccessToken(config, 'user-1', 'admin')
    const res = await request(protectedApp())
      .get('/protected')
      .set('Authorization', `Bearer ${access}`)

    expect(res.status).toBe(200)
    expect(res.body.user).toEqual({
      id: 'user-1',
      roles: ['admin'],
      permissions: permissionKeysForRole('admin'),
    })
  })

  it('does not protect public health without auth', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
  })
})
