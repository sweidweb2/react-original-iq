import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { loadTestConfig } from '../helpers/test-config.js'

const email = 'auth-flow@originaliq.test'
const password = 'password1'

describe('auth HTTP', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let refreshToken = ''

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Ada',
      lastName: 'Lovelace',
    })

    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email, role: 'client' })
    expect(res.body.tokens.accessToken).toEqual(expect.any(String))
    refreshToken = res.body.tokens.refreshToken as string
  })

  it('rejects a duplicate email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email, password })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ code: 'CONFLICT' })
  })

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-pass' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password })

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe(email)
    expect(res.body.tokens.accessToken).toEqual(expect.any(String))
    refreshToken = res.body.tokens.refreshToken as string
  })

  it('refreshes tokens and logs out', async () => {
    const refreshed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken })

    expect(refreshed.status).toBe(200)
    expect(refreshed.body.accessToken).toEqual(expect.any(String))
    expect(refreshed.body.refreshToken).toEqual(expect.any(String))

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: refreshed.body.refreshToken })

    expect(logout.status).toBe(204)
  })

  it('rejects an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'not-a-token' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
