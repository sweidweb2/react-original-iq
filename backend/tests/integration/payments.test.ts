import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'
import { flushBackgroundTasks } from '../../src/background/index.js'
import { setMailerForTests } from '../../src/mail/index.js'
import { MANUAL_GATEWAY, SIMULATED_GATEWAY } from '../../src/modules/payments/payments.types.js'
import {
  createManagedTask,
  createRoleCast,
  expectStatusFor,
  type HttpActor,
  type RoleCast,
} from '../helpers/http-actors.js'
import { loadTestConfig } from '../helpers/test-config.js'

describe('payments and refunds role matrix HTTP', () => {
  setMailerForTests({
    isConfigured: () => true,
    send: vi.fn(async () => ({ messageId: 'test', delivered: true })),
  })
  const config = loadTestConfig()
  const app = createApp({ config })
  let cast: RoleCast

  const checkout = (taskId: string, amount?: number) => (actor: HttpActor) =>
    request(app)
      .post(`/api/v1/tasks/${taskId}/payments/checkout`)
      .set(...actor.auth)
      .send(amount === undefined ? {} : { amount })
  const manual = (taskId: string, body: object) => (actor: HttpActor) =>
    request(app)
      .post(`/api/v1/tasks/${taskId}/payments`)
      .set(...actor.auth)
      .send(body)
  const refund = (taskId: string, amount: number) => (actor: HttpActor) =>
    request(app)
      .post(`/api/v1/tasks/${taskId}/refunds`)
      .set(...actor.auth)
      .send({ amount, refundReason: 'Role matrix' })

  async function paymentStatusOf(taskId: string): Promise<string> {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set(...cast.admin.auth)
    return res.body.paymentStatus as string
  }

  beforeAll(async () => {
    cast = await createRoleCast(app, config, 'payments')
  })

  afterEach(flushBackgroundTasks)

  afterAll(() => setMailerForTests(null))

  it('shows the ledger to admins and the paying client only', async () => {
    const task = await createManagedTask(app, cast, { price: 100, tutorId: cast.tutor.id })
    const view = (actor: HttpActor) =>
      request(app)
        .get(`/api/v1/tasks/${task.id}/payments`)
        .set(...actor.auth)

    expect((await request(app).get(`/api/v1/tasks/${task.id}/payments`)).status).toBe(401)
    await expectStatusFor({ super: cast.super, admin: cast.admin, client: cast.client }, 200, view)
    await expectStatusFor(
      {
        coordinator: cast.coordinator,
        tutor: cast.tutor,
        otherTutor: cast.otherTutor,
        otherCoordinator: cast.otherCoordinator,
        otherClient: cast.otherClient,
      },
      403,
      view,
    )

    const summary = (await view(cast.client)).body.summary
    expect(summary).toMatchObject({ price: 100, paidTotal: 0, due: 100, paymentStatus: 'unpaid' })
  })

  it('D1/D3: only the task client checks out; paying the balance issues an invoice', async () => {
    const task = await createManagedTask(app, cast, { price: 100 })
    await expectStatusFor(
      {
        super: cast.super,
        admin: cast.admin,
        coordinator: cast.coordinator,
        tutor: cast.tutor,
        otherClient: cast.otherClient,
      },
      403,
      checkout(task.id),
    )

    const paid = await checkout(task.id)(cast.client)
    expect(paid.status).toBe(201)
    expect(paid.body).toMatchObject({
      amount: 100,
      status: 'paid',
      gateway: SIMULATED_GATEWAY,
      userId: cast.client.id,
    })
    expect(paid.body.invoice.invoiceNumber).toMatch(/^INV-\d{6,}$/)
    expect(await paymentStatusOf(task.id)).toBe('paid')

    const again = await checkout(task.id)(cast.client)
    expect(again.status).toBe(400)
  })

  it('D2: partial payments accumulate until the price is covered', async () => {
    const task = await createManagedTask(app, cast, { price: 100 })

    expect((await checkout(task.id, 40)(cast.client)).status).toBe(201)
    expect(await paymentStatusOf(task.id)).toBe('unpaid')

    expect((await checkout(task.id, 70)(cast.client)).status).toBe(400)
    expect((await checkout(task.id, 60)(cast.client)).status).toBe(201)
    expect(await paymentStatusOf(task.id)).toBe('paid')
  })

  it('D6: manual payments are recorded by admins (manage_payments) with no gateway', async () => {
    const task = await createManagedTask(app, cast, { price: 50 })
    await expectStatusFor(
      {
        client: cast.client,
        tutor: cast.tutor,
        coordinator: cast.coordinator,
        otherCoordinator: cast.otherCoordinator,
        otherClient: cast.otherClient,
      },
      403,
      manual(task.id, { amount: 10 }),
    )

    const recorded = await manual(task.id, { amount: 50 })(cast.admin)
    expect(recorded.status).toBe(201)
    expect(recorded.body).toMatchObject({
      status: 'paid',
      gateway: MANUAL_GATEWAY,
      userId: cast.client.id,
    })
    expect(recorded.body.invoice).not.toBeNull()
    expect(await paymentStatusOf(task.id)).toBe('paid')

    expect((await manual(task.id, { amount: 1 })(cast.admin)).status).toBe(400)
  })

  it('only admins edit or delete payments; invoiced payments cannot be deleted', async () => {
    const task = await createManagedTask(app, cast, { price: 80 })
    const invoiced = (await manual(task.id, { amount: 30 })(cast.admin)).body as {
      id: string
    }
    const pending = (await manual(task.id, { amount: 20, status: 'pending' })(cast.admin)).body as {
      id: string
    }

    const edit = (paymentId: string, body: object) => (actor: HttpActor) =>
      request(app)
        .patch(`/api/v1/tasks/${task.id}/payments/${paymentId}`)
        .set(...actor.auth)
        .send(body)
    const remove = (paymentId: string) => (actor: HttpActor) =>
      request(app)
        .delete(`/api/v1/tasks/${task.id}/payments/${paymentId}`)
        .set(...actor.auth)
    const denied = {
      client: cast.client,
      tutor: cast.tutor,
      coordinator: cast.coordinator,
      otherCoordinator: cast.otherCoordinator,
    }

    await expectStatusFor(denied, 403, edit(invoiced.id, { paymentMethod: 'cash' }))
    await expectStatusFor(denied, 403, remove(pending.id))

    const blocked = await remove(invoiced.id)(cast.admin)
    expect(blocked.status).toBe(409)
    expect(blocked.body).toMatchObject({ code: 'PAYMENT_INVOICED' })

    const canceled = await edit(invoiced.id, { status: 'canceled' })(cast.admin)
    expect(canceled.status).toBe(200)
    expect(canceled.body.invoice).toBeNull()
    expect(canceled.body.voidedInvoices).toHaveLength(1)

    expect((await remove(pending.id)(cast.super)).status).toBe(204)
  })

  it('returns payment logs to staff but not to the client', async () => {
    const task = await createManagedTask(app, cast, { price: 25 })
    const payment = (await checkout(task.id)(cast.client)).body as { id: string }
    await flushBackgroundTasks()

    const detail = (actor: HttpActor) =>
      request(app)
        .get(`/api/v1/tasks/${task.id}/payments/${payment.id}`)
        .set(...actor.auth)

    const asClient = await detail(cast.client)
    expect(asClient.status).toBe(200)
    expect(asClient.body.logs).toEqual([])

    const asAdmin = await detail(cast.admin)
    expect(asAdmin.body.logs.length).toBeGreaterThan(0)

    expect((await detail(cast.tutor)).status).toBe(403)
  })

  it('D7/D8/D9: refunds are admin-only, capped, and drive payment status', async () => {
    const task = await createManagedTask(app, cast, { price: 100 })
    expect((await checkout(task.id)(cast.client)).status).toBe(201)

    const lowered = await request(app)
      .patch(`/api/v1/tasks/${task.id}/price`)
      .set(...cast.coordinator.auth)
      .send({ price: 80 })
    expect(lowered.body.paymentStatus).toBe('refund_pending')

    await expectStatusFor(
      {
        client: cast.client,
        tutor: cast.tutor,
        coordinator: cast.coordinator,
        otherCoordinator: cast.otherCoordinator,
        otherClient: cast.otherClient,
      },
      403,
      refund(task.id, 20),
    )

    expect((await refund(task.id, 150)(cast.admin)).status).toBe(400)

    const created = await refund(task.id, 20)(cast.admin)
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('pending')
    expect(await paymentStatusOf(task.id)).toBe('refund_pending')

    const settle = (refundId: string, status: 'paid' | 'canceled') => (actor: HttpActor) =>
      request(app)
        .patch(`/api/v1/tasks/${task.id}/refunds/${refundId}`)
        .set(...actor.auth)
        .send({ status })
    await expectStatusFor(
      { client: cast.client, tutor: cast.tutor, coordinator: cast.coordinator },
      403,
      settle(created.body.id, 'paid'),
    )

    const settled = await settle(created.body.id, 'paid')(cast.admin)
    expect(settled.status).toBe(200)
    expect(await paymentStatusOf(task.id)).toBe('paid')

    const deletePaid = await request(app)
      .delete(`/api/v1/tasks/${task.id}/refunds/${created.body.id as string}`)
      .set(...cast.admin.auth)
    expect(deletePaid.status).toBe(400)
  })

  it('B13: a task with payments cannot be deleted', async () => {
    const task = await createManagedTask(app, cast, { price: 10 })
    expect((await checkout(task.id)(cast.client)).status).toBe(201)

    const res = await request(app)
      .delete(`/api/v1/tasks/${task.id}`)
      .set(...cast.admin.auth)
    expect(res.status).toBe(409)
  })
})
