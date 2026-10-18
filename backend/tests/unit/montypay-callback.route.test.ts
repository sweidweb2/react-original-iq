import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { montyPayHash } from '../../src/modules/payments/montypay.js'
import { loadTestConfig } from '../helpers/test-config.js'

const password = 'merchant-pass'

function signed(overrides: Record<string, string> = {}) {
  const { hash: hashOverride, ...rest } = overrides
  const fields = {
    id: 'txn-route',
    order_number: 'not-a-task-order',
    order_amount: '10.00',
    order_currency: 'USD',
    order_description: 'Task missing',
    order_status: 'settled',
    status: 'success',
    ...rest,
  }
  return {
    ...fields,
    hash:
      hashOverride ??
      montyPayHash([
        fields.id,
        fields.order_number,
        fields.order_amount,
        fields.order_currency,
        fields.order_description,
        password,
      ]),
  }
}

describe('POST /montypay-callback', () => {
  const app = createApp({
    config: loadTestConfig({
      MONTYPAY_API_URL: 'https://checkout.montypay.com/api/v1/session',
      MONTYPAY_MERCHANT_KEY: 'merchant-key',
      MONTYPAY_MERCHANT_PASSWORD: password,
      MONTYPAY_CALLBACK_SECRET: 'callback-secret',
    }),
  })

  it('accepts the registered URL with JSON and no query token', async () => {
    const res = await request(app).post('/montypay-callback').send(signed())
    expect(res.status).toBe(200)
    expect(res.text).toBe('OK')
  })

  it('accepts a form body the way MontyPay posts it', async () => {
    const res = await request(app).post('/montypay-callback').type('form').send(signed())
    expect(res.status).toBe(200)
    expect(res.text).toBe('OK')
  })

  it('rejects a bad hash', async () => {
    const res = await request(app)
      .post('/montypay-callback')
      .send(signed({ hash: 'deadbeef' }))
    expect(res.status).toBe(400)
  })
})
