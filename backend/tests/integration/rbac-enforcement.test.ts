import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { permissionKeysForRole } from '../../src/authz/index.js'
import { resetRbacRepositoryForTests } from '../../src/modules/rbac/rbac.repository.js'
import { createRoleCast, type HttpActor, type RoleCast } from '../helpers/http-actors.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('RBAC enforcement HTTP', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let cast: RoleCast

  const get = (path: string) => (actor: HttpActor) =>
    request(app)
      .get(path)
      .set(...actor.auth)
  const send = (method: 'post' | 'put', path: string, body: object) => {
    const agent = request(app)
    const req = method === 'post' ? agent.post(path) : agent.put(path)
    return req.set(...cast.super.auth).send(body)
  }

  async function createPermission(key: string): Promise<string> {
    const res = await send('post', '/api/v1/rbac/permissions', { key, name: key })
    expect(res.status).toBe(201)
    return res.body.id as string
  }

  beforeAll(async () => {
    resetRbacRepositoryForTests()
    cast = await createRoleCast(app, config, 'rbac-enforce')
  })

  afterAll(() => {
    resetRbacRepositoryForTests()
  })

  it('returns effective permissions on /auth/me (catalog defaults while roles are unseeded)', async () => {
    const res = await get('/api/v1/auth/me')(cast.coordinator)
    expect(res.status).toBe(200)
    expect(res.body.user.permissions).toEqual(permissionKeysForRole('coordinator'))
    expect(res.body.user.permissions).not.toContain('manage_payments')
  })

  it('applies role edits immediately on this instance', async () => {
    expect((await get('/api/v1/tasks')(cast.coordinator)).status).toBe(200)

    const role = await send('post', '/api/v1/rbac/roles', {
      key: 'coordinator',
      name: 'Coordinator',
    })
    expect(role.status).toBe(201)
    expect((await get('/api/v1/tasks')(cast.coordinator)).status).toBe(403)

    const viewTasks = await createPermission('view_tasks')
    const assigned = await send('put', `/api/v1/rbac/roles/${role.body.id}/permissions`, {
      permissionIds: [viewTasks],
    })
    expect(assigned.status).toBe(200)
    expect((await get('/api/v1/tasks')(cast.coordinator)).status).toBe(200)
    expect((await get('/api/v1/users')(cast.coordinator)).status).toBe(403)
  })

  it('adds direct user grants on top of the role', async () => {
    expect((await get('/api/v1/contact/leads')(cast.tutor)).status).toBe(403)

    const manageLeads = await createPermission('manage_leads')
    const granted = await send('put', `/api/v1/rbac/users/${cast.tutor.id}/permissions`, {
      permissionIds: [manageLeads],
    })
    expect(granted.status).toBe(200)

    expect((await get('/api/v1/contact/leads')(cast.tutor)).status).toBe(200)
    expect((await get('/api/v1/contact/leads')(cast.otherTutor)).status).toBe(403)
  })

  it('keeps super on the RBAC page even with an empty role', async () => {
    const role = await send('post', '/api/v1/rbac/roles', { key: 'super', name: 'Super' })
    expect(role.status).toBe(201)

    expect((await get('/api/v1/settings')(cast.super)).status).toBe(403)
    expect((await get('/api/v1/rbac/roles')(cast.super)).status).toBe(200)
  })
})
