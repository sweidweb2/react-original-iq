import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { createUsersRepository } from '../../src/modules/users/users.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

async function registerClient(app: ReturnType<typeof createApp>, email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register').send({
    email,
    password: 'password1',
    firstName: 'Zip',
    lastName: 'Client',
    phone: '+96170123456',
  })
  expect(res.status).toBe(201)
  return res.body.tokens.accessToken as string
}

describe('task zip downloads HTTP', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let ownerToken = ''
  let otherToken = ''
  let taskId = ''

  beforeAll(async () => {
    // Client task creation auto-assigns an active coordinator.
    await createUsersRepository(config).createAccount({
      email: 'zip-coordinator@originaliq.test',
      passwordHash: await hashPassword('password1'),
      role: 'coordinator',
      firstName: 'Zip',
      lastName: 'Coordinator',
    })
    ownerToken = await registerClient(app, 'zip-owner@originaliq.test')
    otherToken = await registerClient(app, 'zip-other@originaliq.test')
    const created = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        topic: 'Zip test',
        type: 'assignment',
        category: 'Writing',
        description: 'Bulk download check',
        deadline: '2030-01-01T12:00:00.000Z',
      })
    expect(created.status).toBe(201)
    taskId = created.body.id as string
  })

  it('denies a client who is not on the task', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/files/zip`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  it('returns NO_FILES when the task has nothing to zip', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/files/zip`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ code: 'NO_FILES' })
  })

  it('validates selected ids', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/files/zip?ids=not-a-uuid`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(400)
  })
})
