import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/index.js'

describe('backend integration (health)', () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    PORT: '3000',
    CORS_ORIGINS: 'http://localhost:5173',
    TRUST_PROXY: 'false',
  })

  it('GET /api/v1/health returns ok', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(res.headers['x-request-id']).toBeTruthy()
  })

  it('GET /api/v1/health/db without Supabase returns 503', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/health/db')

    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({
      code: 'DB_NOT_CONFIGURED',
      message: 'Supabase is not configured',
    })
  })

  it('unknown route returns 404 AppError shape', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/missing')

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Route not found',
    })
  })
})
