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

describe('task lifecycle role matrix HTTP', () => {
  const config = loadTestConfig()
  const app = createApp({ config })
  let cast: RoleCast

  const post = (path: string, body?: object) => (actor: HttpActor) =>
    request(app)
      .post(path)
      .set(...actor.auth)
      .send(body ?? {})

  beforeAll(async () => {
    cast = await createRoleCast(app, config, 'lifecycle')
  })

  it('requires auth for every task route', async () => {
    expect((await request(app).get('/api/v1/tasks')).status).toBe(401)
    expect((await request(app).post('/api/v1/tasks').send({})).status).toBe(401)
  })

  it('B1: a client task starts pending, unpaid, free and with an auto-assigned coordinator', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set(...cast.client.auth)
      .send({
        topic: 'Client task',
        type: 'assignment',
        category: 'Writing',
        description: 'Client-created',
        deadline: '2030-01-01T12:00:00.000Z',
        price: 500,
      })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      clientId: cast.client.id,
      status: 'pending',
      price: 0,
      tutorId: null,
    })
    expect([cast.coordinator.id, cast.otherCoordinator.id]).toContain(res.body.coordinatorId)

    const forOther = await request(app)
      .post('/api/v1/tasks')
      .set(...cast.client.auth)
      .send({
        clientId: cast.otherClient.id,
        topic: 'Not mine',
        type: 'assignment',
        category: 'Writing',
        description: 'Should fail',
        deadline: '2030-01-01T12:00:00.000Z',
      })
    expect(forOther.status).toBe(403)

    const tutorCreates = await request(app)
      .post('/api/v1/tasks')
      .set(...cast.tutor.auth)
      .send({
        topic: 'Tutor task',
        type: 'assignment',
        category: 'Writing',
        description: 'Should fail',
        deadline: '2030-01-01T12:00:00.000Z',
      })
    expect(tutorCreates.status).toBe(403)
  })

  it('I1: only related parties and admins can read a task', async () => {
    const task = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    const read = (actor: HttpActor) =>
      request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .set(...actor.auth)

    await expectStatusFor(
      {
        super: cast.super,
        admin: cast.admin,
        coordinator: cast.coordinator,
        tutor: cast.tutor,
        client: cast.client,
      },
      200,
      read,
    )
    await expectStatusFor(
      {
        otherCoordinator: cast.otherCoordinator,
        otherTutor: cast.otherTutor,
        otherClient: cast.otherClient,
      },
      403,
      read,
    )

    const otherList = await request(app)
      .get('/api/v1/tasks')
      .set(...cast.otherClient.auth)
    expect(otherList.status).toBe(200)
    expect(otherList.body.data.map((row: { id: string }) => row.id)).not.toContain(task.id)

    const tutorList = await request(app)
      .get('/api/v1/tasks')
      .set(...cast.tutor.auth)
    expect(tutorList.body.data.map((row: { id: string }) => row.id)).toContain(task.id)
  })

  it('B2/B3: only the managing coordinator or admins assign a tutor, once', async () => {
    const task = await createManagedTask(app, cast)
    const assign = post(`/api/v1/tasks/${task.id}/assign-tutor`, { tutorId: cast.tutor.id })

    await expectStatusFor(
      {
        client: cast.client,
        tutor: cast.tutor,
        otherCoordinator: cast.otherCoordinator,
        otherClient: cast.otherClient,
      },
      403,
      assign,
    )

    const assigned = await assign(cast.coordinator)
    expect(assigned.status).toBe(200)
    expect(assigned.body).toMatchObject({ tutorId: cast.tutor.id, status: 'in-progress' })

    const second = await post(`/api/v1/tasks/${task.id}/assign-tutor`, {
      tutorId: cast.otherTutor.id,
    })(cast.admin)
    expect(second.status).toBe(409)
  })

  it('B4/B5/B6/B7 and I2: tutor submits, coordinator approves or disapproves', async () => {
    const task = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    expect(task.status).toBe('in-progress')
    const submit = post(`/api/v1/tasks/${task.id}/submit`)

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

    expect((await submit(cast.tutor)).body.status).toBe('waiting_coordinator_approval')

    const cancelSubmit = await post(`/api/v1/tasks/${task.id}/cancel-submit`)(cast.tutor)
    expect(cancelSubmit.status).toBe(200)
    expect(cancelSubmit.body.status).toBe('in-progress')

    expect((await submit(cast.tutor)).status).toBe(200)

    const approve = post(`/api/v1/tasks/${task.id}/approve`)
    const disapprove = post(`/api/v1/tasks/${task.id}/disapprove`)
    const denied = {
      client: cast.client,
      tutor: cast.tutor,
      otherCoordinator: cast.otherCoordinator,
    }
    await expectStatusFor(denied, 403, approve)
    await expectStatusFor(denied, 403, disapprove)

    const back = await disapprove(cast.coordinator)
    expect(back.status).toBe(200)
    expect(back.body.status).toBe('in-progress')

    expect((await submit(cast.tutor)).status).toBe(200)
    const approved = await approve(cast.coordinator)
    expect(approved.status).toBe(200)
    expect(approved.body.status).toBe('completed')

    const again = await approve(cast.super)
    expect(again.status).toBe(400)
  })

  it('B8/B9/B10: cancel and activate are staff-only and restore the right status', async () => {
    const withTutor = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    const withoutTutor = await createManagedTask(app, cast)

    const cancel = (id: string) => post(`/api/v1/tasks/${id}/cancel`)
    const activate = (id: string) => post(`/api/v1/tasks/${id}/activate`)

    await expectStatusFor(
      { client: cast.client, tutor: cast.tutor, otherCoordinator: cast.otherCoordinator },
      403,
      cancel(withTutor.id),
    )

    expect((await cancel(withTutor.id)(cast.coordinator)).body.status).toBe('cancelled')
    expect((await cancel(withoutTutor.id)(cast.admin)).body.status).toBe('cancelled')

    await expectStatusFor(
      { client: cast.client, tutor: cast.tutor, otherCoordinator: cast.otherCoordinator },
      403,
      activate(withTutor.id),
    )

    expect((await activate(withTutor.id)(cast.coordinator)).body.status).toBe('in-progress')
    expect((await activate(withoutTutor.id)(cast.super)).body.status).toBe('pending')
  })

  it('B11: removing the tutor of an in-progress task returns it to pending', async () => {
    const task = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    const remove = post(`/api/v1/tasks/${task.id}/remove-tutor`)

    await expectStatusFor(
      { client: cast.client, tutor: cast.tutor, otherCoordinator: cast.otherCoordinator },
      403,
      remove,
    )

    const removed = await remove(cast.coordinator)
    expect(removed.status).toBe(200)
    expect(removed.body).toMatchObject({ tutorId: null, status: 'pending' })
  })

  it('price edits are limited to the managing coordinator and admins', async () => {
    const task = await createManagedTask(app, cast)
    const price = (amount: number) => (actor: HttpActor) =>
      request(app)
        .patch(`/api/v1/tasks/${task.id}/price`)
        .set(...actor.auth)
        .send({ price: amount })

    await expectStatusFor(
      { client: cast.client, tutor: cast.tutor, otherCoordinator: cast.otherCoordinator },
      403,
      price(1),
    )

    const coordinator = await price(120)(cast.coordinator)
    expect(coordinator.status).toBe(200)
    expect(coordinator.body).toMatchObject({ price: 120, paymentStatus: 'unpaid' })

    expect((await price(150)(cast.admin)).body.price).toBe(150)
    expect((await price(0)(cast.super)).body).toMatchObject({ price: 0, paymentStatus: 'paid' })
  })

  it('I4: allow-view and change-coordinator are admin actions', async () => {
    const task = await createManagedTask(app, cast)

    const allowView = (actor: HttpActor) =>
      request(app)
        .post(`/api/v1/tasks/${task.id}/allow-view`)
        .set(...actor.auth)
        .send({ allowView: true })
    await expectStatusFor(
      { client: cast.client, tutor: cast.tutor, coordinator: cast.coordinator },
      403,
      allowView,
    )
    const allowed = await allowView(cast.admin)
    expect(allowed.status).toBe(200)
    expect(allowed.body.allowView).toBe(true)

    const change = post(`/api/v1/tasks/${task.id}/change-coordinator`, {
      coordinatorId: cast.otherCoordinator.id,
    })
    await expectStatusFor({ client: cast.client, coordinator: cast.coordinator }, 403, change)
    const changed = await change(cast.admin)
    expect(changed.status).toBe(200)
    expect(changed.body.coordinatorId).toBe(cast.otherCoordinator.id)

    const oldCoordinator = await request(app)
      .get(`/api/v1/tasks/${task.id}`)
      .set(...cast.coordinator.auth)
    expect(oldCoordinator.status).toBe(403)
  })

  it('B12: clients may delete only their own pending, unassigned tasks', async () => {
    const pending = await createManagedTask(app, cast)
    const assigned = await createManagedTask(app, cast, { tutorId: cast.tutor.id })
    const remove = (id: string) => (actor: HttpActor) =>
      request(app)
        .delete(`/api/v1/tasks/${id}`)
        .set(...actor.auth)

    await expectStatusFor(
      { otherClient: cast.otherClient, tutor: cast.tutor, otherCoordinator: cast.otherCoordinator },
      403,
      remove(pending.id),
    )

    expect((await remove(assigned.id)(cast.client)).status).toBe(400)
    expect((await remove(pending.id)(cast.client)).status).toBe(204)
    expect((await remove(assigned.id)(cast.coordinator)).status).toBe(204)

    const gone = await request(app)
      .get(`/api/v1/tasks/${pending.id}`)
      .set(...cast.admin.auth)
    expect(gone.status).toBe(404)
  })
})
