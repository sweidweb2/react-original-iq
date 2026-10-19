import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { getPasswordResetCodeForTests } from '../../src/modules/auth/login-verifications.repository.js'
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
      phone: '+96170123456',
    })

    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email, role: 'client' })
    expect(res.body.tokens.accessToken).toEqual(expect.any(String))
    refreshToken = res.body.tokens.refreshToken as string
  })

  it('rejects a duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password, phone: '+96170123456' })

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

    const afterLogout = await request(app).post('/api/v1/auth/refresh').send({ refreshToken })
    expect(afterLogout.status).toBe(401)
  })

  it('logging out one session leaves other sessions signed in', async () => {
    const first = await request(app).post('/api/v1/auth/login').send({ email, password })
    const second = await request(app).post('/api/v1/auth/login').send({ email, password })

    await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: first.body.tokens.refreshToken })

    const stillLive = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: second.body.tokens.refreshToken })
    expect(stillLive.status).toBe(200)
  })

  it('rejects an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'not-a-token' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('resets password with a verification code', async () => {
    const loginBefore = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(loginBefore.status).toBe(200)
    const userId = loginBefore.body.user.id as string
    const sessionBeforeReset = loginBefore.body.tokens.refreshToken as string

    const forgot = await request(app).post('/api/v1/auth/password/forgot').send({ email })
    expect(forgot.status).toBe(200)
    expect(forgot.body.message).toEqual(expect.any(String))

    const code = getPasswordResetCodeForTests(userId)
    expect(code).toMatch(/^\d{6}$/)

    const badVerify = await request(app)
      .post('/api/v1/auth/password/verify')
      .send({ email, code: '000000' })
    expect(badVerify.status).toBe(401)

    const verify = await request(app).post('/api/v1/auth/password/verify').send({ email, code })
    expect(verify.status).toBe(200)

    const newPassword = 'newpass99'
    const reset = await request(app).post('/api/v1/auth/password/reset').send({
      email,
      code,
      newPassword,
      confirmPassword: newPassword,
    })
    expect(reset.status).toBe(200)

    const oldSession = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: sessionBeforeReset })
    expect(oldSession.status).toBe(401)

    const loginNew = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword })
    expect(loginNew.status).toBe(200)

    const loginOld = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(loginOld.status).toBe(401)
  })

  it('returns the authenticated profile on GET /auth/me', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'newpass99' })
    const accessToken = login.body.tokens.accessToken as string

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(me.status).toBe(200)
    expect(me.body.user).toMatchObject({ email, role: 'client' })
  })
})
