import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { createUsersRepository } from '../../src/modules/users/users.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

const FILENAME =
  /attachment; filename="backup_[\w-]+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.(csv|json|xlsx|sql|zip)"/

describe('super backups HTTP', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let superToken = ''
  let adminToken = ''

  async function login(email: string, role: 'super' | 'admin') {
    await createUsersRepository(config).createAccount({
      email,
      passwordHash: await hashPassword('password1'),
      role,
      firstName: 'Backup',
      lastName: role,
    })
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' })
    return res.body.tokens.accessToken as string
  }

  beforeAll(async () => {
    superToken = await login('backups-super@originaliq.test', 'super')
    adminToken = await login('backups-admin@originaliq.test', 'admin')
  })

  it('is SUPER-only', async () => {
    for (const req of [
      request(app).get('/api/v1/backups/meta'),
      request(app).get('/api/v1/backups/history'),
      request(app).post('/api/v1/backups').send({ type: 'all_tables', format: 'csv' }),
    ]) {
      const res = await req.set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(403)
    }
    const anonymous = await request(app).get('/api/v1/backups/meta')
    expect(anonymous.status).toBe(401)
  })

  it('serves backup options to super', async () => {
    const res = await request(app)
      .get('/api/v1/backups/meta')
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(200)
    expect(res.body.tables).toContain('users')
    expect(res.body.formats).toEqual(['csv', 'json', 'xlsx', 'sql'])
    expect(res.body.storage).toEqual({ configured: false, folders: [] })
  })

  it('rejects unknown tables, formats and storage when it is not configured', async () => {
    const badTable = await request(app)
      .post('/api/v1/backups')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ type: 'table', table: 'pg_shadow', format: 'csv' })
    expect(badTable.status).toBe(400)

    const badFormat = await request(app)
      .post('/api/v1/backups')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ type: 'users', format: 'exe' })
    expect(badFormat.status).toBe(400)

    const badFolder = await request(app)
      .post('/api/v1/backups')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ type: 'storage_folder', folder: '../etc' })
    expect(badFolder.status).toBe(400)

    const noStorage = await request(app)
      .post('/api/v1/backups')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ type: 'storage_full' })
    expect(noStorage.status).toBe(503)
  })

  it('downloads a table backup, records it, and re-exports it from history', async () => {
    const res = await request(app)
      .post('/api/v1/backups')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ type: 'table', table: 'tasks', format: 'json' })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(res.headers['content-disposition']).toMatch(FILENAME)
    expect(Number(res.headers['content-length'])).toBe(Buffer.byteLength(res.text))
    expect(JSON.parse(res.text)).toMatchObject({ table: 'tasks', rowCount: 0, rows: [] })

    const history = await request(app)
      .get('/api/v1/backups/history')
      .set('Authorization', `Bearer ${superToken}`)
    expect(history.status).toBe(200)
    expect(history.body.meta).toMatchObject({ page: 1, total: 1 })
    const [entry] = history.body.data
    expect(entry).toMatchObject({
      type: 'table',
      target: 'tasks',
      format: 'json',
      status: 'completed',
      rowCount: 0,
      rerunOf: null,
    })
    expect(entry.sizeBytes).toBe(Buffer.byteLength(res.text))
    expect(entry).not.toHaveProperty('rows')

    const rerun = await request(app)
      .post(`/api/v1/backups/history/${entry.id as string}/rerun`)
      .set('Authorization', `Bearer ${superToken}`)
    expect(rerun.status).toBe(200)
    expect(rerun.headers['content-disposition']).toMatch(FILENAME)

    const after = await request(app)
      .get('/api/v1/backups/history')
      .set('Authorization', `Bearer ${superToken}`)
    expect(after.body.meta.total).toBe(2)
    expect(after.body.data[0]).toMatchObject({ rerunOf: entry.id, status: 'completed' })
  })

  it('returns 404 when re-exporting an unknown backup', async () => {
    const res = await request(app)
      .post('/api/v1/backups/history/00000000-0000-4000-8000-000000000000/rerun')
      .set('Authorization', `Bearer ${superToken}`)
    expect(res.status).toBe(404)
  })
})
