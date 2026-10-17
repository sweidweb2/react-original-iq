import { z } from 'zod'

import type { AppConfig } from '../../config/index.js'
import type { UsdRatesSnapshot } from './fx.types.js'

const FETCH_TIMEOUT_MS = 5000

const upstreamResponseSchema = z.object({
  result: z.literal('success'),
  rates: z.record(z.string(), z.number().positive()),
})

export type FxRepository = {
  /** Fresh (within TTL) USD-based rates; fetches upstream when expired. Throws on upstream failure. */
  getUsdRates: () => Promise<UsdRatesSnapshot>
  /** Last successful snapshot regardless of TTL, or null if none yet. */
  peekCached: () => UsdRatesSnapshot | null
}

export type FxRepositoryDeps = {
  fetch?: typeof fetch
  now?: () => number
}

export function createFxRepository(config: AppConfig, deps: FxRepositoryDeps = {}): FxRepository {
  const doFetch = deps.fetch ?? fetch
  const now = deps.now ?? Date.now
  const { apiUrl, cacheTtlMs } = config.fx

  let cache: { snapshot: UsdRatesSnapshot; expiresAt: number } | null = null
  let inFlight: Promise<UsdRatesSnapshot> | null = null

  async function fetchUpstream(): Promise<UsdRatesSnapshot> {
    const response = await doFetch(`${apiUrl}/USD`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`FX upstream responded ${response.status}`)
    }
    const body = upstreamResponseSchema.parse(await response.json())
    return { rates: body.rates, fetchedAt: new Date(now()).toISOString() }
  }

  return {
    async getUsdRates() {
      if (cache && now() < cache.expiresAt) {
        return cache.snapshot
      }
      if (!inFlight) {
        inFlight = fetchUpstream()
          .then((snapshot) => {
            cache = { snapshot, expiresAt: now() + cacheTtlMs }
            return snapshot
          })
          .finally(() => {
            inFlight = null
          })
      }
      return inFlight
    },

    peekCached() {
      return cache?.snapshot ?? null
    },
  }
}
