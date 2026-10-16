import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { createUsersRepository } from '../../src/modules/users/users.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('users and logs HTTP', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let adminToken = ''
  let clientToken = ''

  beforeAll(async () => {
    const repo = createUsersRepository(config)
    await repo.createAccount({
      email: 'access-admin@originaliq.test',
      passwordHash: await hashPassword('password1'),
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
    })

    const client = await request(app).post('/api/v1/auth/register').send({
      email: 'access-client@originaliq.test',
      password: 'password1',
      firstName: 'Client',
      lastName: 'User',
    })
    expect(client.status).toBe(201)
    clientToken = client.body.tokens.accessToken as string

    const admin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'access-admin@originaliq.test', password: 'password1' })
    expect(admin.status).toBe(200)
    adminToken = admin.body.tokens.accessToken as string
  })

  it('requires auth and the admin role to list users', async () => {
    const anonymous = await request(app).get('/api/v1/users')
    expect(anonymous.status).toBe(401)

    const client = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${clientToken}`)
    expect(client.status).toBe(403)
    expect(client.body).toMatchObject({ code: 'FORBIDDEN' })

    const admin = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(admin.status).toBe(200)
    expect(admin.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'access-admin@originaliq.test', role: 'admin' }),
        expect.objectContaining({ email: 'access-client@originaliq.test', role: 'client' }),
      ]),
    )
    expect(admin.body.meta).toMatchObject({ page: 1, limit: 20 })
    expect(admin.body.meta.total).toBeGreaterThanOrEqual(2)
    expect(JSON.stringify(admin.body)).not.toContain('passwordHash')
  })

  it('returns 404 for an unknown user and lets an admin create one', async () => {
    const missing = await request(app)
      .get('/api/v1/users/missing-user')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(missing.status).toBe(404)
    expect(missing.body).toMatchObject({ code: 'USER_NOT_FOUND' })

    const forbidden = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ email: 'new@originaliq.test', name: 'New User', roles: ['client'] })
    expect(forbidden.status).toBe(403)

    const created = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new@originaliq.test',
        name: 'New User',
        password: 'password1',
        role: 'tutor',
      })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({
      email: 'new@originaliq.test',
      role: 'tutor',
      status: 'ACTIVE',
    })
    expect(created.body).not.toHaveProperty('passwordHash')

    const stats = await request(app)
      .get('/api/v1/users/stats')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(stats.status).toBe(200)
    expect(stats.body.total).toBeGreaterThanOrEqual(3)
    expect(stats.body.byRole.tutor).toBeGreaterThanOrEqual(1)

    const updated = await request(app)
      .patch(`/api/v1/users/${created.body.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Tutor', role: 'tutor' })
    expect(updated.status).toBe(200)
    expect(updated.body.profile.displayName).toBe('Updated Tutor')

    const deactivated = await request(app)
      .post(`/api/v1/users/${created.body.id as string}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(deactivated.status).toBe(200)
    expect(deactivated.body.status).toBe('INACTIVE')
  })

  it('returns 404 when update or deactivate targets a missing user', async () => {
    const update = await request(app)
      .patch('/api/v1/users/missing-user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated' })
    expect(update.status).toBe(404)
    expect(update.body).toMatchObject({ code: 'USER_NOT_FOUND' })

    const clientDeactivate = await request(app)
      .post('/api/v1/users/missing-user/deactivate')
      .set('Authorization', `Bearer ${clientToken}`)
    expect(clientDeactivate.status).toBe(403)

    const adminDeactivate = await request(app)
      .post('/api/v1/users/missing-user/deactivate')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(adminDeactivate.status).toBe(404)
    expect(adminDeactivate.body).toMatchObject({ code: 'USER_NOT_FOUND' })
  })

  it('limits activity and error logs to admins', async () => {
    const anonymous = await request(app).get('/api/v1/activity-logs')
    expect(anonymous.status).toBe(401)

    const client = await request(app)
      .get('/api/v1/error-logs')
      .set('Authorization', `Bearer ${clientToken}`)
    expect(client.status).toBe(403)

    const activity = await request(app)
      .get('/api/v1/activity-logs')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(activity.status).toBe(200)
    expect(activity.body).toMatchObject({ data: [], meta: { page: 1, limit: 20, total: 0 } })

    const errors = await request(app)
      .get('/api/v1/error-logs')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(errors.status).toBe(200)
    expect(errors.body).toMatchObject({ data: [], meta: { page: 1, limit: 20, total: 0 } })
  })
})
