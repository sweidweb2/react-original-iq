import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { errorHandler } from '../../src/errors/error.middleware.js'
import { createAuthenticate } from '../../src/middleware/authenticate.js'
import { authorize } from '../../src/middleware/authorize.js'
import type { RoleName } from '../../src/modules/auth/auth.schema.js'
import { signAccessToken } from '../../src/modules/auth/auth.tokens.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('authorize middleware', () => {
  const config = loadTestConfig()
  const authenticate = createAuthenticate(config)

  function gatedApp(...roles: RoleName[]) {
    const app = express()
    app.get('/admin', authenticate, authorize(...roles), (req, res) => {
      res.status(200).json({ user: req.user })
    })
    app.use(errorHandler)
    return app
  }

  it('rejects unauthenticated requests', async () => {
    const res = await request(gatedApp('admin')).get('/admin')
    expect(res.status).toBe(401)
  })

  it('forbids authenticated users without an allowed role', async () => {
    const access = signAccessToken(config, 'user-1', 'client')
    const res = await request(gatedApp('admin'))
      .get('/admin')
      .set('Authorization', `Bearer ${access}`)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('allows matching roles', async () => {
    const access = signAccessToken(config, 'user-1', 'admin')
    const res = await request(gatedApp('admin', 'coordinator'))
      .get('/admin')
      .set('Authorization', `Bearer ${access}`)
    expect(res.status).toBe(200)
    expect(res.body.user.roles).toEqual(['admin'])
  })
})
