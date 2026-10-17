import { describe, expect, it, vi } from 'vitest'

import { createFxRepository } from '../../src/modules/fx/fx.repository.js'
import { loadTestConfig } from '../helpers/test-config.js'

const TTL = 60_000

function okResponse(rates: Record<string, number>): Response {
  return new Response(JSON.stringify({ result: 'success', base_code: 'USD', rates }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function setup() {
  const config = loadTestConfig({
    FX_API_URL: 'https://fx.example.test/v6/latest/',
    FX_CACHE_TTL_MS: String(TTL),
  })
  let clock = 1_000_000
  const fetchMock = vi.fn<typeof fetch>(async () => okResponse({ USD: 1, SAR: 3.75 }))
  const repository = createFxRepository(config, { fetch: fetchMock, now: () => clock })
  return {
    repository,
    fetchMock,
    advance: (ms: number) => {
      clock += ms
    },
  }
}

describe('fx repository', () => {
  it('fetches USD rates from the configured URL', async () => {
    const { repository, fetchMock } = setup()
    const snapshot = await repository.getUsdRates()
    expect(snapshot.rates.SAR).toBe(3.75)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://fx.example.test/v6/latest/USD')
  })

  it('serves cached rates within the TTL', async () => {
    const { repository, fetchMock, advance } = setup()
    await repository.getUsdRates()
    advance(TTL - 1)
    await repository.getUsdRates()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refetches after the TTL expires', async () => {
    const { repository, fetchMock, advance } = setup()
    await repository.getUsdRates()
    advance(TTL)
    await repository.getUsdRates()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shares one upstream call across concurrent requests', async () => {
    const { repository, fetchMock } = setup()
    await Promise.all([
      repository.getUsdRates(),
      repository.getUsdRates(),
      repository.getUsdRates(),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws on upstream failure but keeps the last snapshot for peeking', async () => {
    const { repository, fetchMock, advance } = setup()
    const first = await repository.getUsdRates()
    advance(TTL)
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 503 }))
    await expect(repository.getUsdRates()).rejects.toThrow('503')
    expect(repository.peekCached()).toEqual(first)
  })

  it('rejects malformed upstream payloads', async () => {
    const { repository, fetchMock } = setup()
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ result: 'error' }), { status: 200 }),
    )
    await expect(repository.getUsdRates()).rejects.toThrow()
    expect(repository.peekCached()).toBeNull()
  })
})
