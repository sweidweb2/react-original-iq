import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { errorHandler } from '../../src/errors/error.middleware.js'
import { withSendGate } from '../../src/mail/mailer.js'
import { createMaintenanceGuard } from '../../src/middleware/maintenance.js'
import { signAccessToken } from '../../src/modules/auth/auth.tokens.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('maintenance guard', () => {
  const config = loadTestConfig()

  function appWith(enabled: boolean) {
    const app = express()
    app.use(createMaintenanceGuard({ isMaintenance: async () => enabled, config }))
    app.all(/.*/, (_req, res) => {
      res.status(200).json({ ok: true })
    })
    app.use(errorHandler)
    return app
  }

  it('lets everything through when maintenance is off', async () => {
    const res = await request(appWith(false)).post('/auth/register')
    expect(res.status).toBe(200)
  })

  it('keeps the allowlist reachable', async () => {
    const app = appWith(true)
    for (const req of [
      request(app).get('/health'),
      request(app).get('/health/db'),
      request(app).get('/settings/status'),
      request(app).post('/auth/login'),
      request(app).post('/auth/refresh'),
      request(app).post('/auth/logout'),
    ]) {
      expect((await req).status).toBe(200)
    }
  })

  it('blocks anonymous and non-SUPER requests with 503', async () => {
    const app = appWith(true)
    const clientToken = signAccessToken(config, 'client-1', 'client')

    const register = await request(app).post('/auth/register')
    expect(register.status).toBe(503)
    expect(register.body.code).toBe('MAINTENANCE_MODE')
    expect(register.headers['retry-after']).toBeDefined()

    const tasks = await request(app).get('/tasks').set('Authorization', `Bearer ${clientToken}`)
    expect(tasks.status).toBe(503)

    const forged = await request(app).get('/tasks').set('Authorization', 'Bearer not-a-jwt')
    expect(forged.status).toBe(503)

    const statusWrite = await request(app).post('/settings/status')
    expect(statusWrite.status).toBe(503)
  })

  it('lets SUPER access tokens through', async () => {
    const superToken = signAccessToken(config, 'super-1', 'super')
    const res = await request(appWith(true))
      .patch('/settings')
      .set('Authorization', `Bearer ${superToken}`)
    expect(res.status).toBe(200)
  })
})

describe('withSendGate', () => {
  const sent: string[] = []
  const inner = {
    isConfigured: () => true,
    async send(message: { to: string }) {
      sent.push(message.to)
      return { messageId: 'id-1', delivered: true }
    },
  }

  it('sends only while enabled', async () => {
    let enabled = true
    const mailer = withSendGate(inner, async () => enabled)
    const message = { to: 'a@b.co', subject: 's', text: 't' }

    await expect(mailer.send(message)).resolves.toMatchObject({ delivered: true })
    enabled = false
    await expect(mailer.send(message)).resolves.toEqual({
      messageId: null,
      delivered: false,
      skipped: 'disabled',
    })
    expect(sent).toEqual(['a@b.co'])
  })
})
