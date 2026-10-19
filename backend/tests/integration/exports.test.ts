import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { createUsersRepository } from '../../src/modules/users/users.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

const FILENAME = /attachment; filename="[\w-]+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.(csv|pdf)"/

const EXPORT_PATHS = [
  '/api/v1/exports/specializations',
  '/api/v1/exports/payment-logs',
  '/api/v1/contact/leads/export',
  '/api/v1/contact/leads/export.pdf',
  '/api/v1/contact/newsletter/export',
  '/api/v1/contact/newsletter/export.pdf',
  '/api/v1/contact/messages/export',
]

describe('exports HTTP (super only)', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let superToken = ''
  let adminToken = ''
  let clientToken = ''

  async function login(email: string, role: 'super' | 'admin') {
    await createUsersRepository(config).createAccount({
      email,
      passwordHash: await hashPassword('password1'),
      role,
      firstName: 'Export',
      lastName: role,
    })
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' })
    return res.body.tokens.accessToken as string
  }

  beforeAll(async () => {
    superToken = await login('exports-super@originaliq.test', 'super')
    adminToken = await login('exports-admin@originaliq.test', 'admin')

    const client = await request(app).post('/api/v1/auth/register').send({
      email: 'exports-client@originaliq.test',
      password: 'password1',
      firstName: 'Export',
      lastName: 'Client',
      phone: '+96170123456',
    })
    clientToken = client.body.tokens.accessToken as string

    await request(app)
      .post('/api/v1/contact/leads')
      .send({ country: 'Lebanon', dialCode: '+961', phone: '70858167' })
  })

  it('denies admins and clients on every export endpoint', async () => {
    for (const path of EXPORT_PATHS) {
      for (const token of [adminToken, clientToken]) {
        const res = await request(app).get(path).set('Authorization', `Bearer ${token}`)
        expect(res.status, path).toBe(403)
      }
    }
  })

  it('serves a timestamped UTF-8 CSV with BOM to super', async () => {
    const res = await request(app)
      .get('/api/v1/exports/specializations')
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.headers['content-disposition']).toMatch(FILENAME)
    expect(res.text.startsWith('\uFEFFid,tutor_id,tutor_name')).toBe(true)
  })

  it('serves leads and stay-updated as PDF to super', async () => {
    for (const path of [
      '/api/v1/contact/leads/export.pdf',
      '/api/v1/contact/newsletter/export.pdf',
    ]) {
      const res = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${superToken}`)
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = []
          response.on('data', (chunk: Buffer) => chunks.push(chunk))
          response.on('end', () => done(null, Buffer.concat(chunks)))
        })

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('application/pdf')
      expect(res.headers['content-disposition']).toMatch(FILENAME)
      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-')
    }
  })
})
