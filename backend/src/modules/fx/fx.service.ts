import { reportError } from '../../errors/report-error.js'
import type { FxRepository } from './fx.repository.js'
import type { ConvertQuery } from './fx.schema.js'
import {
  type FxConversion,
  type FxRates,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  type UsdRatesSnapshot,
} from './fx.types.js'

export type FxService = {
  getRates: (base: SupportedCurrency) => Promise<FxRates>
  convert: (query: ConvertQuery) => Promise<FxConversion>
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function createFxService(repository: FxRepository): FxService {
  /** Fresh rates, else stale cache, else null (caller falls back to USD). */
  async function loadSnapshot(): Promise<UsdRatesSnapshot | null> {
    try {
      return await repository.getUsdRates()
    } catch (error) {
      const stale = repository.peekCached()
      reportError(error, {
        source: 'fx.fetch_rates',
        level: stale ? 'warning' : 'error',
        meta: { servingStale: Boolean(stale) },
      })
      return stale
    }
  }

  return {
    async getRates(base) {
      const snapshot = await loadSnapshot()
      const baseRate = snapshot?.rates[base]
      if (!snapshot || !baseRate) {
        return { base: 'USD', rates: { USD: 1 }, fetchedAt: null, fallback: true }
      }

      const rates: FxRates['rates'] = {}
      for (const code of SUPPORTED_CURRENCIES) {
        const usdRate = snapshot.rates[code]
        if (usdRate) rates[code] = usdRate / baseRate
      }
      return { base, rates, fetchedAt: snapshot.fetchedAt, fallback: false }
    },

    async convert({ amount, from, to }) {
      const snapshot = await loadSnapshot()
      const fromRate = snapshot?.rates[from]
      const toRate = snapshot?.rates[to]
      if (!snapshot || !fromRate || !toRate) {
        return {
          amount,
          from: 'USD',
          to: 'USD',
          rate: 1,
          converted: roundMoney(amount),
          fetchedAt: null,
          fallback: true,
        }
      }

      const rate = toRate / fromRate
      return {
        amount,
        from,
        to,
        rate,
        converted: roundMoney(amount * rate),
        fetchedAt: snapshot.fetchedAt,
        fallback: false,
      }
    },
  }
}
