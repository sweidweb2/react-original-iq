import { describe, expect, it } from 'vitest'

import type { FxRepository } from '../../src/modules/fx/fx.repository.js'
import { createFxService } from '../../src/modules/fx/fx.service.js'
import type { UsdRatesSnapshot } from '../../src/modules/fx/fx.types.js'

const snapshot: UsdRatesSnapshot = {
  rates: { USD: 1, SAR: 3.75, EUR: 0.9, AED: 3.6725, XYZ: 42 },
  fetchedAt: '2026-10-17T10:00:00.000Z',
}

function fakeRepository(options: {
  fresh?: UsdRatesSnapshot
  stale?: UsdRatesSnapshot | null
}): FxRepository {
  return {
    async getUsdRates() {
      if (options.fresh) return options.fresh
      throw new Error('upstream down')
    },
    peekCached: () => options.stale ?? null,
  }
}

describe('fx service', () => {
  it('returns supported USD-based rates only', async () => {
    const service = createFxService(fakeRepository({ fresh: snapshot }))
    const result = await service.getRates('USD')
    expect(result).toEqual({
      base: 'USD',
      rates: { USD: 1, SAR: 3.75, EUR: 0.9, AED: 3.6725 },
      fetchedAt: snapshot.fetchedAt,
      fallback: false,
    })
  })

  it('rebases rates to another currency', async () => {
    const service = createFxService(fakeRepository({ fresh: snapshot }))
    const result = await service.getRates('SAR')
    expect(result.base).toBe('SAR')
    expect(result.rates.SAR).toBe(1)
    expect(result.rates.USD).toBeCloseTo(1 / 3.75, 10)
    expect(result.rates.EUR).toBeCloseTo(0.9 / 3.75, 10)
  })

  it('converts between currencies and rounds to 2 decimals', async () => {
    const service = createFxService(fakeRepository({ fresh: snapshot }))
    const result = await service.convert({ amount: 100, from: 'USD', to: 'SAR' })
    expect(result).toMatchObject({
      from: 'USD',
      to: 'SAR',
      rate: 3.75,
      converted: 375,
      fallback: false,
    })

    const cross = await service.convert({ amount: 10, from: 'EUR', to: 'AED' })
    expect(cross.converted).toBe(40.81)
  })

  it('serves stale cache when upstream fails', async () => {
    const service = createFxService(fakeRepository({ stale: snapshot }))
    const result = await service.convert({ amount: 2, from: 'USD', to: 'SAR' })
    expect(result).toMatchObject({ converted: 7.5, fallback: false, fetchedAt: snapshot.fetchedAt })
  })

  it('falls back to USD when upstream fails and nothing is cached', async () => {
    const service = createFxService(fakeRepository({}))

    expect(await service.getRates('SAR')).toEqual({
      base: 'USD',
      rates: { USD: 1 },
      fetchedAt: null,
      fallback: true,
    })
    expect(await service.convert({ amount: 12.345, from: 'EUR', to: 'SAR' })).toEqual({
      amount: 12.345,
      from: 'USD',
      to: 'USD',
      rate: 1,
      converted: 12.35,
      fetchedAt: null,
      fallback: true,
    })
  })

  it('falls back when a requested currency is missing upstream', async () => {
    const service = createFxService(
      fakeRepository({ fresh: { rates: { USD: 1 }, fetchedAt: snapshot.fetchedAt } }),
    )
    const result = await service.convert({ amount: 5, from: 'USD', to: 'IQD' })
    expect(result.fallback).toBe(true)
    expect(result.to).toBe('USD')
  })
})
