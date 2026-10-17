import express from 'express'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { notFound } from '../../src/errors/app-error.js'
import { errorHandler } from '../../src/errors/error.middleware.js'
import { reportError } from '../../src/errors/report-error.js'
import { requestContext } from '../../src/middleware/request-context.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { createUsersRepository } from '../../src/modules/users/users.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

type ErrorLogBody = {
  data: Array<{
    id: string
    source: string | null
    level: string
    message: string
    path: string | null
    status: number | null
    requestId: string | null
    meta: Record<string, unknown> | null
  }>
  meta: { total: number }
}

/** Minimal app wired like the real one: request scope → route → error middleware. */
function createFailingApp() {
  const app = express()
  app.use(requestContext)
  app.get('/explode', () => {
    throw new Error('database exploded')
  })
  app.get('/missing', () => {
    throw notFound('Nothing here')
  })
  app.get('/swallowed', async (_req, res) => {
    await Promise.resolve()
    reportError(new Error('mail relay refused'), {
      source: 'invoices.email',
      level: 'warning',
      meta: { invoiceId: 'inv-7' },
    })
    res.status(200).json({ ok: true })
  })
  app.use(errorHandler)
  return app
}

async function waitForLogs() {
  await new Promise((resolve) => setTimeout(resolve, 20))
}

describe('error logs HTTP', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  const failing = createFailingApp()
  let superToken = ''
  let adminToken = ''

  async function listErrors(query = ''): Promise<ErrorLogBody> {
    const res = await request(app)
      .get(`/api/v1/error-logs${query}`)
      .set('Authorization', `Bearer ${superToken}`)
    expect(res.status).toBe(200)
    return res.body as ErrorLogBody
  }

  beforeAll(async () => {
    const repo = createUsersRepository(config)
    for (const role of ['super', 'admin'] as const) {
      await repo.createAccount({
        email: `errors-${role}@originaliq.test`,
        passwordHash: await hashPassword('password1'),
        role,
        firstName: role,
        lastName: 'User',
      })
    }
    const superLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'errors-super@originaliq.test', password: 'password1' })
    superToken = superLogin.body.tokens.accessToken as string
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'errors-admin@originaliq.test', password: 'password1' })
    adminToken = adminLogin.body.tokens.accessToken as string
  })

  it('is readable by super only', async () => {
    const admin = await request(app)
      .get('/api/v1/error-logs')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(admin.status).toBe(403)

    const adminStats = await request(app)
      .get('/api/v1/error-logs/stats')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(adminStats.status).toBe(403)
  })

  it('records an unexpected 500 with its request context', async () => {
    const res = await request(failing).get('/explode').set('x-request-id', 'req-explode')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ code: 'INTERNAL_ERROR', message: 'Internal server error' })
    await waitForLogs()

    const body = await listErrors('?source=http&search=exploded')
    expect(body.data[0]).toMatchObject({
      source: 'http',
      level: 'error',
      message: 'database exploded',
      path: '/explode',
      status: 500,
      requestId: 'req-explode',
    })
  })

  it('records failures reported from swallowing catch blocks', async () => {
    await request(failing).get('/swallowed').expect(200)
    await waitForLogs()

    const body = await listErrors('?level=warning')
    expect(body.data[0]).toMatchObject({
      source: 'invoices.email',
      level: 'warning',
      message: 'mail relay refused',
      meta: { invoiceId: 'inv-7' },
    })
  })

  it('does not record handled business errors or malformed bodies', async () => {
    const before = (await listErrors()).meta.total

    await request(failing).get('/missing').expect(404)
    const malformed = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
    expect(malformed.status).toBe(400)
    expect(malformed.body).toMatchObject({ code: 'VALIDATION_ERROR' })
    await waitForLogs()

    expect((await listErrors()).meta.total).toBe(before)
  })

  it('returns error stats', async () => {
    const res = await request(app)
      .get('/api/v1/error-logs/stats')
      .set('Authorization', `Bearer ${superToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      total: expect.any(Number),
      today: expect.any(Number),
      lastWeek: expect.any(Number),
      errors: expect.any(Number),
      warnings: expect.any(Number),
    })
    expect(res.body.warnings).toBeGreaterThanOrEqual(1)
    expect(res.body.errors).toBeGreaterThanOrEqual(1)
  })

  it('lets only super delete error logs', async () => {
    const id = '00000000-0000-4000-8000-000000000000'
    const single = await request(app)
      .delete(`/api/v1/error-logs/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(single.status).toBe(403)

    const bulk = await request(app)
      .post('/api/v1/error-logs/delete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [id] })
    expect(bulk.status).toBe(403)

    const clear = await request(app)
      .delete('/api/v1/error-logs')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(clear.status).toBe(403)
  })

  it('deletes one, selected, and then all error logs', async () => {
    for (const message of ['delete-a', 'delete-b', 'delete-c', 'delete-d']) {
      reportError(new Error(message), { source: 'tests.delete' })
    }
    await waitForLogs()

    const rows = (await listErrors('?source=tests.delete&limit=50')).data
    expect(rows).toHaveLength(4)
    const [first, second, third] = rows.map((row) => row.id)

    await request(app)
      .delete(`/api/v1/error-logs/${first}`)
      .set('Authorization', `Bearer ${superToken}`)
      .expect(204)
    await request(app)
      .delete(`/api/v1/error-logs/${first}`)
      .set('Authorization', `Bearer ${superToken}`)
      .expect(404)

    const bulk = await request(app)
      .post('/api/v1/error-logs/delete')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ ids: [second, third] })
    expect(bulk.status).toBe(200)
    expect(bulk.body).toEqual({ deleted: 2 })
    expect((await listErrors('?source=tests.delete')).meta.total).toBe(1)

    const invalid = await request(app)
      .post('/api/v1/error-logs/delete')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ ids: [] })
    expect(invalid.status).toBe(400)

    const clear = await request(app)
      .delete('/api/v1/error-logs')
      .set('Authorization', `Bearer ${superToken}`)
    expect(clear.status).toBe(200)
    expect(clear.body.deleted).toBeGreaterThanOrEqual(1)
    expect((await listErrors()).meta.total).toBe(0)
  })
})
