import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest, type AuthTokens, bindAuthSession } from '@/services/api'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiRequest refresh', () => {
  const tokens: AuthTokens = {
    accessToken: 'access-old',
    refreshToken: 'refresh-1',
  }
  let sessionTokens: AuthTokens | null = { ...tokens }
  const setTokens = vi.fn((next: AuthTokens) => {
    sessionTokens = next
  })
  const clearSession = vi.fn(() => {
    sessionTokens = null
  })

  beforeEach(() => {
    sessionTokens = { ...tokens }
    setTokens.mockClear()
    clearSession.mockClear()
    bindAuthSession({
      getAccessToken: () => sessionTokens?.accessToken,
      getRefreshToken: () => sessionTokens?.refreshToken,
      setTokens,
      clearSession,
    })
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refreshes once on 401 and retries with the new access token', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'expired' } }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: 'access-new',
          refreshToken: 'refresh-2',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const result = await apiRequest<{ ok: boolean }>('/activity-logs?page=1')

    expect(result).toEqual({ ok: true })
    expect(setTokens).toHaveBeenCalledWith({
      accessToken: 'access-new',
      refreshToken: 'refresh-2',
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer access-new',
    })
  })

  it('clears the session when refresh fails', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'expired' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'bad refresh' } }, 401))

    await expect(apiRequest('/activity-logs')).rejects.toBeInstanceOf(ApiError)
    expect(clearSession).toHaveBeenCalled()
  })

  it('does not refresh auth endpoints', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: 'nope' } }, 401))

    await expect(
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.c', password: 'x' }),
        skipAuthRefresh: true,
      }),
    ).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(setTokens).not.toHaveBeenCalled()
  })
})
