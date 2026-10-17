import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { createUsersRepository } from '../../src/modules/users/users.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('admin analytics HTTP', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let adminToken = ''
  let clientToken = ''

  beforeAll(async () => {
    await createUsersRepository(config).createAccount({
      email: 'analytics-admin@originaliq.test',
      passwordHash: await hashPassword('password1'),
      role: 'admin',
      firstName: 'Analytics',
      lastName: 'Admin',
    })
    const admin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'analytics-admin@originaliq.test', password: 'password1' })
    adminToken = admin.body.tokens.accessToken as string

    const client = await request(app).post('/api/v1/auth/register').send({
      email: 'analytics-client@originaliq.test',
      password: 'password1',
      firstName: 'Analytics',
      lastName: 'Client',
    })
    clientToken = client.body.tokens.accessToken as string
  })

  it('serves the overview to admins', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      users: { total: 0 },
      tasks: { total: 0, completionRate: 0 },
      revenue: { currencies: [] },
      feedback: { averageRating: null },
      topTutors: [],
    })
    expect(res.body.monthly).toHaveLength(6)
  })

  it('rejects clients and anonymous callers', async () => {
    const client = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${clientToken}`)
    expect(client.status).toBe(403)

    const anonymous = await request(app).get('/api/v1/analytics/overview')
    expect(anonymous.status).toBe(401)
  })
})
