import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { createUsersRepository } from '../../src/modules/users/users.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('Zod request validation', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let superAccessToken = ''

  beforeAll(async () => {
    // Use the same config as createApp so tests stay on the in-memory repo.
    const repo = createUsersRepository(config)
    await repo.createAccount({
      email: 'admin@originaliq.test',
      passwordHash: await hashPassword('secret123'),
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
    })

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@originaliq.test', password: 'secret123' })

    expect(login.status).toBe(200)
    superAccessToken = login.body.tokens.accessToken as string
  })

  it('rejects invalid body with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'x' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
    expect(res.body.details).toBeTruthy()
  })

  it('rejects invalid query with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .get('/api/v1/activity-logs')
      .set('Authorization', `Bearer ${superAccessToken}`)
      .query({ limit: '0' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
  })

  it('rejects invalid params with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .get('/api/v1/users/%20')
      .set('Authorization', `Bearer ${superAccessToken}`)

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
  })

  it('rejects a non-UUID user id with 400 instead of reaching the database', async () => {
    const res = await request(app)
      .get('/api/v1/users/not-a-uuid')
      .set('Authorization', `Bearer ${superAccessToken}`)

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('rejects an unbounded page number', async () => {
    const res = await request(app)
      .get('/api/v1/activity-logs')
      .set('Authorization', `Bearer ${superAccessToken}`)
      .query({ page: '10001' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts valid query and returns list meta', async () => {
    const res = await request(app)
      .get('/api/v1/activity-logs')
      .set('Authorization', `Bearer ${superAccessToken}`)
      .query({ page: '2', limit: '10' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      data: [],
      meta: { page: 2, limit: 10 },
    })
  })
})
