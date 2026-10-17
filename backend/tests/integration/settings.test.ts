import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import {
  createSettingsRepository,
  createSettingsService,
  resetSettingsRepositoryForTests,
} from '../../src/modules/settings/index.js'
import { createUsersRepository } from '../../src/modules/users/users.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('settings + maintenance HTTP', () => {
  const config = loadTestConfig()
  const settings = createSettingsService(createSettingsRepository(config), { ttlMs: 0 })
  const app = createApp({ config, settings })
  let superToken = ''
  let adminToken = ''
  let clientToken = ''

  async function login(email: string, role: 'super' | 'admin' | 'client') {
    await createUsersRepository(config).createAccount({
      email,
      passwordHash: await hashPassword('password1'),
      role,
      firstName: 'Settings',
      lastName: role,
    })
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' })
    return res.body.tokens.accessToken as string
  }

  beforeAll(async () => {
    resetSettingsRepositoryForTests()
    superToken = await login('settings-super@originaliq.test', 'super')
    adminToken = await login('settings-admin@originaliq.test', 'admin')
    clientToken = await login('settings-client@originaliq.test', 'client')
  })

  afterAll(() => {
    resetSettingsRepositoryForTests()
  })

  it('exposes only the maintenance flag publicly', async () => {
    const res = await request(app).get('/api/v1/settings/status')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ maintenanceMode: false })
  })

  it('is SUPER-only to read and update', async () => {
    const anonymous = await request(app).get('/api/v1/settings')
    expect(anonymous.status).toBe(401)

    const admin = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maintenanceMode: true })
    expect(admin.status).toBe(403)

    const read = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${superToken}`)
    expect(read.status).toBe(200)
    expect(read.body).toMatchObject({ maintenanceMode: false, emailsSend: true })
  })

  it('validates the update body', async () => {
    for (const body of [{}, { maintenanceMode: 'yes' }, { unknown: true }]) {
      const res = await request(app)
        .patch('/api/v1/settings')
        .set('Authorization', `Bearer ${superToken}`)
        .send(body)
      expect(res.status).toBe(400)
    }
  })

  it('locks out everyone but SUPER while maintenance is on', async () => {
    const enable = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ maintenanceMode: true })
    expect(enable.status).toBe(200)
    expect(enable.body.maintenanceMode).toBe(true)

    const status = await request(app).get('/api/v1/settings/status')
    expect(status.body).toEqual({ maintenanceMode: true })

    const clientMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${clientToken}`)
    expect(clientMe.status).toBe(503)
    expect(clientMe.body.code).toBe('MAINTENANCE_MODE')

    const clientLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'settings-client@originaliq.test', password: 'password1' })
    expect(clientLogin.status).toBe(503)

    const register = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'new-user@originaliq.test', password: 'password1' })
    expect(register.status).toBe(503)

    const superMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${superToken}`)
    expect(superMe.status).toBe(200)

    const disable = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ maintenanceMode: false })
    expect(disable.status).toBe(200)

    const clientAgain = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${clientToken}`)
    expect(clientAgain.status).toBe(200)
  })
})
