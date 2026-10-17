import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import {
  createManagedTask,
  createRoleCast,
  expectStatusFor,
  type HttpActor,
  type RoleCast,
} from '../helpers/http-actors.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('revisions role matrix HTTP', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let cast: RoleCast

  const post = (path: string, body?: object) => (actor: HttpActor) =>
    request(app)
      .post(path)
      .set(...actor.auth)
      .send(body ?? {})

  async function openRevision(taskId: string, actor: HttpActor = cast.coordinator) {
    const res = await post(`/api/v1/tasks/${taskId}/revisions`, { title: 'Fix references' })(actor)
    expect(res.status).toBe(201)
    return res.body as { id: string; status: string; startDate: string | null }
  }

  beforeAll(async () => {
    cast = await createRoleCast(app, config, 'revisions')
  })

  it('C1/C2: only the managing coordinator or admins open one revision at a time', async () => {
    const task = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    const create = post(`/api/v1/tasks/${task.id}/revisions`, { title: 'Round 1' })

    expect((await request(app).post(`/api/v1/tasks/${task.id}/revisions`)).status).toBe(401)
    await expectStatusFor(
      {
        client: cast.client,
        tutor: cast.tutor,
        otherCoordinator: cast.otherCoordinator,
        otherClient: cast.otherClient,
      },
      403,
      create,
    )

    const created = await create(cast.coordinator)
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ taskId: task.id, status: 'in-revision' })
    expect(created.body.startDate).toEqual(expect.any(String))

    const second = await create(cast.admin)
    expect(second.status).toBe(409)
  })

  it('lists and reads revisions only for related parties with view_revisions', async () => {
    const task = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    const revision = await openRevision(task.id, cast.super)

    const list = (actor: HttpActor) =>
      request(app)
        .get(`/api/v1/tasks/${task.id}/revisions`)
        .set(...actor.auth)
    const read = (actor: HttpActor) =>
      request(app)
        .get(`/api/v1/revisions/${revision.id}`)
        .set(...actor.auth)

    const related = {
      super: cast.super,
      admin: cast.admin,
      coordinator: cast.coordinator,
      tutor: cast.tutor,
    }
    const denied = {
      client: cast.client,
      otherCoordinator: cast.otherCoordinator,
      otherTutor: cast.otherTutor,
      otherClient: cast.otherClient,
    }
    await expectStatusFor(related, 200, list)
    await expectStatusFor(related, 200, read)
    await expectStatusFor(denied, 403, list)
    await expectStatusFor(denied, 403, read)

    const listed = await list(cast.tutor)
    expect(listed.body.data.map((row: { id: string }) => row.id)).toEqual([revision.id])
  })

  it('C3/C4/C5/C6: assigned tutor submits; managing staff approve or reject', async () => {
    const task = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    const revision = await openRevision(task.id)
    const submit = post(`/api/v1/revisions/${revision.id}/submit`)
    const cancelSubmit = post(`/api/v1/revisions/${revision.id}/cancel-submit`)
    const approve = post(`/api/v1/revisions/${revision.id}/approve`)
    const reject = post(`/api/v1/revisions/${revision.id}/reject`)

    await expectStatusFor(
      {
        client: cast.client,
        coordinator: cast.coordinator,
        admin: cast.admin,
        otherTutor: cast.otherTutor,
      },
      403,
      submit,
    )

    const submitted = await submit(cast.tutor)
    expect(submitted.status).toBe(200)
    expect(submitted.body.status).toBe('waiting_coordinator_approval')

    await expectStatusFor(
      { otherTutor: cast.otherTutor, coordinator: cast.coordinator },
      403,
      cancelSubmit,
    )
    const cancelled = await cancelSubmit(cast.tutor)
    expect(cancelled.status).toBe(200)
    expect(cancelled.body).toMatchObject({ status: 'in-revision', submitDate: null })

    expect((await submit(cast.tutor)).status).toBe(200)

    const denied = {
      client: cast.client,
      tutor: cast.tutor,
      otherCoordinator: cast.otherCoordinator,
    }
    await expectStatusFor(denied, 403, approve)
    await expectStatusFor(denied, 403, reject)

    const rejected = await reject(cast.coordinator)
    expect(rejected.status).toBe(200)
    expect(rejected.body.status).toBe('in-revision')

    expect((await submit(cast.tutor)).status).toBe(200)
    const approved = await approve(cast.admin)
    expect(approved.status).toBe(200)
    expect(approved.body.status).toBe('completed')
    expect(approved.body.submitDate).toEqual(expect.any(String))
  })

  it('C7: edit and cancel are staff-only and only while open', async () => {
    const task = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    const revision = await openRevision(task.id)

    const edit = (actor: HttpActor) =>
      request(app)
        .patch(`/api/v1/revisions/${revision.id}`)
        .set(...actor.auth)
        .send({ title: 'Renamed' })
    const cancel = post(`/api/v1/revisions/${revision.id}/cancel`)
    const denied = {
      client: cast.client,
      tutor: cast.tutor,
      otherCoordinator: cast.otherCoordinator,
    }

    await expectStatusFor(denied, 403, edit)
    await expectStatusFor(denied, 403, cancel)

    const edited = await edit(cast.coordinator)
    expect(edited.status).toBe(200)
    expect(edited.body.title).toBe('Renamed')

    const cancelled = await cancel(cast.coordinator)
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.status).toBe('cancelled')

    expect((await edit(cast.admin)).status).toBe(400)
    expect((await cancel(cast.admin)).status).toBe(400)
  })

  it('C9: a task cannot be approved while a revision is open', async () => {
    const task = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    expect((await post(`/api/v1/tasks/${task.id}/submit`)(cast.tutor)).status).toBe(200)
    await openRevision(task.id)

    const approve = await post(`/api/v1/tasks/${task.id}/approve`)(cast.coordinator)
    expect(approve.status).toBe(400)
    expect(approve.body.message).toMatch(/open revision/i)
  })

  it('rejects revisions on cancelled tasks and unknown ids', async () => {
    const task = await createManagedTask(app, cast)
    expect((await post(`/api/v1/tasks/${task.id}/cancel`)(cast.coordinator)).status).toBe(200)

    const onCancelled = await post(`/api/v1/tasks/${task.id}/revisions`, {})(cast.coordinator)
    expect(onCancelled.status).toBe(400)

    const missing = await request(app)
      .get('/api/v1/revisions/00000000-0000-4000-8000-000000000000')
      .set(...cast.admin.auth)
    expect(missing.status).toBe(404)
    expect(missing.body).toMatchObject({ code: 'REVISION_NOT_FOUND' })
  })
})
