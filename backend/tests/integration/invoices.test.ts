import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'
import { flushBackgroundTasks } from '../../src/background/index.js'
import { setMailerForTests } from '../../src/mail/index.js'
import {
  createManagedTask,
  createRoleCast,
  expectStatusFor,
  type HttpActor,
  type RoleCast,
} from '../helpers/http-actors.js'
import { loadTestConfig } from '../helpers/test-config.js'

const MISSING_ID = '00000000-0000-4000-8000-000000000000'

describe('invoices role matrix HTTP', () => {
  const send = vi.fn(async () => ({ messageId: 'test', delivered: true }))
  setMailerForTests({ isConfigured: () => true, send })
  const config = loadTestConfig()
  const app = createApp({ config })
  let cast: RoleCast
  let invoiceId = ''

  beforeAll(async () => {
    cast = await createRoleCast(app, config, 'invoices')
    const task = await createManagedTask(app, cast, { price: 60 })
    const paid = await request(app)
      .post(`/api/v1/tasks/${task.id}/payments/checkout`)
      .set(...cast.client.auth)
      .send({})
    expect(paid.status).toBe(201)
    invoiceId = paid.body.invoice.id as string
    await flushBackgroundTasks()
  })

  afterAll(() => setMailerForTests(null))

  it('lets admins and the paying client request the PDF, nobody else', async () => {
    const download = (actor: HttpActor) =>
      request(app)
        .get(`/api/v1/invoices/${invoiceId}/download`)
        .set(...actor.auth)

    expect((await request(app).get(`/api/v1/invoices/${invoiceId}/download`)).status).toBe(401)

    await expectStatusFor(
      {
        tutor: cast.tutor,
        coordinator: cast.coordinator,
        otherTutor: cast.otherTutor,
        otherCoordinator: cast.otherCoordinator,
        otherClient: cast.otherClient,
      },
      403,
      download,
    )

    // Storage is not configured in tests, so authorized callers get past authz and hit the missing PDF.
    for (const actor of [cast.super, cast.admin, cast.client]) {
      const res = await download(actor)
      expect(res.status).toBe(404)
      expect(res.body).toMatchObject({ code: 'INVOICE_PDF_MISSING' })
    }
  })

  it('limits resend to admin and super', async () => {
    const resend = (actor: HttpActor) =>
      request(app)
        .post(`/api/v1/invoices/${invoiceId}/resend`)
        .set(...actor.auth)

    await expectStatusFor(
      { client: cast.client, tutor: cast.tutor, coordinator: cast.coordinator },
      403,
      resend,
    )

    send.mockClear()
    for (const actor of [cast.admin, cast.super]) {
      const res = await resend(actor)
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        id: invoiceId,
        invoiceNumber: expect.stringMatching(/^INV-/),
      })
    }
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('returns 404 for unknown invoices and 400 for malformed ids', async () => {
    const missing = await request(app)
      .get(`/api/v1/invoices/${MISSING_ID}/download`)
      .set(...cast.admin.auth)
    expect(missing.status).toBe(404)
    expect(missing.body).toMatchObject({ code: 'INVOICE_NOT_FOUND' })

    const malformed = await request(app)
      .post('/api/v1/invoices/not-a-uuid/resend')
      .set(...cast.admin.auth)
    expect(malformed.status).toBe(400)
  })
})
