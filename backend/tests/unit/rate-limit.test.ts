import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createAuthEmailRateLimiter } from '../../src/middleware/rate-limit.js'
import { loadTestConfig } from '../helpers/test-config.js'

function appWithEmailLimiter(limit: number) {
  const config = loadTestConfig({
    NODE_ENV: 'development',
    TRUST_PROXY: 'true',
    AUTH_EMAIL_RATE_LIMIT_MAX: String(limit),
  })
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json())
  app.post('/login', createAuthEmailRateLimiter(config), (_req, res) => {
    res.status(200).json({ ok: true })
  })
  return app
}

describe('auth email rate limiter', () => {
  it('caps attempts per email even when they come from different IPs', async () => {
    const app = appWithEmailLimiter(3)

    for (let i = 0; i < 3; i += 1) {
      const res = await request(app)
        .post('/login')
        .set('X-Forwarded-For', `203.0.113.${i + 1}`)
        .send({ email: 'Victim@Example.com', password: 'guess' })
      expect(res.status).toBe(200)
    }

    const blocked = await request(app)
      .post('/login')
      .set('X-Forwarded-For', '198.51.100.9')
      .send({ email: ' victim@example.com ', password: 'guess' })
    expect(blocked.status).toBe(429)
    expect(blocked.body).toMatchObject({ code: 'RATE_LIMITED' })

    const otherAccount = await request(app)
      .post('/login')
      .set('X-Forwarded-For', '198.51.100.9')
      .send({ email: 'someone@example.com', password: 'guess' })
    expect(otherAccount.status).toBe(200)
  })
})
