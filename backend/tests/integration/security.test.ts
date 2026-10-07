import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/index.js'

describe('Security middleware', () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    PORT: '3000',
    CORS_ORIGINS: 'http://localhost:5173',
    TRUST_PROXY: 'false',
    JSON_BODY_LIMIT: '1kb',
  })
  const app = createApp({ config })

  it('sets Helmet security headers', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-dns-prefetch-control']).toBe('off')
  })

  it('rejects oversized JSON bodies', async () => {
    const big = 'x'.repeat(2048)
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'a@b.co', password: big })

    expect(res.status).toBe(413)
  })
})
