const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000/api/v1'

export type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
  message?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

/** Bridge so the API client can refresh without importing the Zustand store (cycle-safe). */
export type AuthSessionBridge = {
  getAccessToken: () => string | null | undefined
  getRefreshToken: () => string | null | undefined
  setTokens: (tokens: AuthTokens) => void
  clearSession: () => void
}

let authSession: AuthSessionBridge | null = null
let refreshInFlight: Promise<boolean> | null = null

export function bindAuthSession(bridge: AuthSessionBridge): void {
  authSession = bridge
}

const SKIP_REFRESH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
])

function shouldSkipRefresh(path: string): boolean {
  const pathname = path.split('?')[0] ?? path
  return SKIP_REFRESH_PATHS.has(pathname)
}

async function exchangeRefreshToken(refreshToken: string): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  const data = (await response.json().catch(() => ({}))) as ApiErrorBody & AuthTokens

  if (!response.ok) {
    const message = data.error?.message || data.message || `Request failed (${response.status})`
    throw new ApiError(response.status, message, data.error?.code)
  }

  if (!data.accessToken || !data.refreshToken) {
    throw new ApiError(500, 'Invalid refresh response')
  }

  return { accessToken: data.accessToken, refreshToken: data.refreshToken }
}

async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    const refreshToken = authSession?.getRefreshToken()
    if (!refreshToken || !authSession) {
      return false
    }

    try {
      const tokens = await exchangeRefreshToken(refreshToken)
      authSession.setTokens(tokens)
      return true
    } catch {
      authSession.clearSession()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export type ApiRequestOptions = RequestInit & {
  accessToken?: string | null
  /** Skip 401→refresh→retry (auth endpoints and the refresh call itself). */
  skipAuthRefresh?: boolean
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { accessToken, skipAuthRefresh, headers, ...rest } = options

  const resolveToken = (override?: string | null) => {
    if (override !== undefined) return override
    return authSession?.getAccessToken() ?? null
  }

  const execute = async (token: string | null) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })
    return response
  }

  let token = resolveToken(accessToken)
  let response = await execute(token)

  const canRefresh =
    response.status === 401 &&
    !skipAuthRefresh &&
    !shouldSkipRefresh(path) &&
    Boolean(authSession?.getRefreshToken())

  if (canRefresh) {
    const refreshed = await tryRefreshSession()
    if (refreshed) {
      token = authSession?.getAccessToken() ?? null
      response = await execute(token)
    }
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = (await response.json().catch(() => ({}))) as ApiErrorBody & T

  if (!response.ok) {
    const message = data.error?.message || data.message || `Request failed (${response.status})`
    throw new ApiError(response.status, message, data.error?.code)
  }

  return data as T
}

/** Low-level refresh used by auth service; does not touch session bridge. */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return exchangeRefreshToken(refreshToken)
}

/** Authenticated download (CSV, etc.) with refresh retry; triggers a browser save. */
export async function apiDownload(
  path: string,
  filename: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  const { accessToken, skipAuthRefresh, headers, ...rest } = options

  const resolveToken = (override?: string | null) => {
    if (override !== undefined) return override
    return authSession?.getAccessToken() ?? null
  }

  const execute = async (token: string | null) => {
    return fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })
  }

  let token = resolveToken(accessToken)
  let response = await execute(token)

  const canRefresh =
    response.status === 401 &&
    !skipAuthRefresh &&
    !shouldSkipRefresh(path) &&
    Boolean(authSession?.getRefreshToken())

  if (canRefresh) {
    const refreshed = await tryRefreshSession()
    if (refreshed) {
      token = authSession?.getAccessToken() ?? null
      response = await execute(token)
    }
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as ApiErrorBody
    const message = data.error?.message || data.message || `Request failed (${response.status})`
    throw new ApiError(response.status, message, data.error?.code)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
