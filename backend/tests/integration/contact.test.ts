import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { resetContactRepositoryForTests } from '../../src/modules/contact/contact.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

const message = {
  name: 'Ada Lovelace',
  email: 'ada@originaliq.test',
  subject: 'Tutoring',
  message: 'I would like help with calculus.',
}

describe('contact HTTP', () => {
  const app = createApp({ config: loadTestConfig() })

  beforeEach(() => {
    resetContactRepositoryForTests()
  })

  it('stores a contact message', async () => {
    const res = await request(app).post('/api/v1/contact/messages').send(message)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
  })

  it('rejects a message without a name', async () => {
    const res = await request(app)
      .post('/api/v1/contact/messages')
      .send({ ...message, name: '' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('subscribes an email more than once', async () => {
    const first = await request(app)
      .post('/api/v1/contact/newsletter')
      .send({ email: 'news@originaliq.test' })
    const second = await request(app)
      .post('/api/v1/contact/newsletter')
      .send({ email: 'news@originaliq.test' })

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(second.body).toEqual({ ok: true })
  })
})
