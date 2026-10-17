import { describe, expect, it } from 'vitest'

import { convertQuerySchema, ratesQuerySchema } from '../../src/modules/fx/fx.schema.js'

describe('fx schemas', () => {
  it('defaults rates base to USD and uppercases codes', () => {
    expect(ratesQuerySchema.parse({})).toEqual({ base: 'USD' })
    expect(ratesQuerySchema.parse({ base: ' sar ' })).toEqual({ base: 'SAR' })
  })

  it('coerces amount and defaults from to USD', () => {
    expect(convertQuerySchema.parse({ amount: '12.5', to: 'eur' })).toEqual({
      amount: 12.5,
      from: 'USD',
      to: 'EUR',
    })
  })

  it('rejects unsupported or malformed currency codes', () => {
    expect(ratesQuerySchema.safeParse({ base: 'XYZ' }).success).toBe(false)
    expect(ratesQuerySchema.safeParse({ base: 'US' }).success).toBe(false)
    expect(convertQuerySchema.safeParse({ amount: '1', to: 'BTC' }).success).toBe(false)
  })

  it('requires a target currency', () => {
    expect(convertQuerySchema.safeParse({ amount: '1' }).success).toBe(false)
  })

  it('rejects non-positive or non-numeric amounts', () => {
    expect(convertQuerySchema.safeParse({ amount: '0', to: 'SAR' }).success).toBe(false)
    expect(convertQuerySchema.safeParse({ amount: '-5', to: 'SAR' }).success).toBe(false)
    expect(convertQuerySchema.safeParse({ amount: 'abc', to: 'SAR' }).success).toBe(false)
  })
})
