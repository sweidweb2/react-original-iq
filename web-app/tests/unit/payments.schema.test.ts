import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkoutSchema, paymentFormSchema } from '@/features/shared/tasks/payments.schema'

const validCard = {
  amount: '49.99',
  cardholder: 'Ada Lovelace',
  cardNumber: '4242 4242 4242 4242',
  expiry: '12/27',
  cvc: '123',
}

type ParseResult = { error?: { issues: { path: PropertyKey[]; message: string }[] } }

function messagesFor(result: ParseResult, field: string) {
  return (result.error?.issues ?? [])
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message)
}

describe('checkoutSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-17T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('accepts a valid card and normalizes amount and card number', () => {
    const result = checkoutSchema(49.99).safeParse(validCard)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      amount: 49.99,
      cardholder: 'Ada Lovelace',
      cardNumber: '4242424242424242',
      expiry: '12/27',
      cvc: '123',
    })
  })

  it('allows a partial payment below the balance due', () => {
    const result = checkoutSchema(100).safeParse({ ...validCard, amount: '25' })
    expect(result.success).toBe(true)
    expect(result.data?.amount).toBe(25)
  })

  it('rejects an amount above the balance due', () => {
    const result = checkoutSchema(20).safeParse({ ...validCard, amount: '20.01' })
    expect(messagesFor(result, 'amount')).toEqual(['Amount cannot exceed the balance due (20.00)'])
  })

  it.each([
    ['', 'Amount is required'],
    ['   ', 'Amount is required'],
    ['abc', 'Use a number with up to 2 decimals'],
    ['1.234', 'Use a number with up to 2 decimals'],
    ['-5', 'Use a number with up to 2 decimals'],
    ['0', 'Amount must be at least 0.01'],
    ['0.00', 'Amount must be at least 0.01'],
  ])('rejects amount %j', (amount, message) => {
    const result = checkoutSchema(100).safeParse({ ...validCard, amount })
    expect(messagesFor(result, 'amount')).toContain(message)
  })

  it.each(['1234', '4242 4242 4242 4242 4242', '4242-4242-4242-4242', '4242 abcd 4242 4242'])(
    'rejects card number %j',
    (cardNumber) => {
      const result = checkoutSchema(100).safeParse({ ...validCard, cardNumber })
      expect(messagesFor(result, 'cardNumber')).toEqual(['Enter a valid card number'])
    },
  )

  it('accepts the current month as expiry', () => {
    const result = checkoutSchema(100).safeParse({ ...validCard, expiry: '10/26' })
    expect(result.success).toBe(true)
  })

  it.each(['09/26', '13/27', '00/27', '1227', '12/2027', ''])('rejects expiry %j', (expiry) => {
    const result = checkoutSchema(100).safeParse({ ...validCard, expiry })
    expect(messagesFor(result, 'expiry')).toEqual(['Use MM/YY in the future'])
  })

  it.each(['12', '12345', '12a'])('rejects cvc %j', (cvc) => {
    const result = checkoutSchema(100).safeParse({ ...validCard, cvc })
    expect(messagesFor(result, 'cvc')).toEqual(['CVC must be 3 or 4 digits'])
  })

  it('requires a cardholder name of at least 2 characters', () => {
    const result = checkoutSchema(100).safeParse({ ...validCard, cardholder: ' A ' })
    expect(messagesFor(result, 'cardholder')).toEqual(['Cardholder name is required'])
  })
})

describe('paymentFormSchema', () => {
  it('accepts a manual payment and coerces the amount', () => {
    const result = paymentFormSchema.safeParse({
      amount: ' 10.5 ',
      status: 'paid',
      paymentMethod: ' cash ',
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ amount: 10.5, status: 'paid', paymentMethod: 'cash' })
  })

  it('has no balance cap (the API enforces it)', () => {
    const result = paymentFormSchema.safeParse({
      amount: '99999.99',
      status: 'pending',
      paymentMethod: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown status', () => {
    const result = paymentFormSchema.safeParse({
      amount: '10',
      status: 'settled',
      paymentMethod: '',
    })
    expect(messagesFor(result, 'status')).toHaveLength(1)
  })

  it('rejects a payment method longer than 64 characters', () => {
    const result = paymentFormSchema.safeParse({
      amount: '10',
      status: 'paid',
      paymentMethod: 'x'.repeat(65),
    })
    expect(messagesFor(result, 'paymentMethod')).toHaveLength(1)
  })
})
