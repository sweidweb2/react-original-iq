import { useDownloadStore } from '@/stores/downloadStore'

/** Defaults to same-origin: on Vercel the `backend` service is mounted at `/api`. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api/v1'

export type ApiErrorBody = {
  code?: string
  message?: string
  details?: unknown
  error?: {
    code?: string
    message?: string
  }
}

/** `status` 0 = the request never got an HTTP response (offline, DNS, CORS, server down). */
export const NETWORK_ERROR_STATUS = 0

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function apiErrorFromBody(status: number, data: ApiErrorBody): ApiError {
  const message = data.error?.message || data.message || `Request failed (${status})`
  return new ApiError(status, message, data.code ?? data.error?.code, data.details)
}

async function fetchOrNetworkError(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(NETWORK_ERROR_STATUS, 'Network request failed', 'NETWORK_ERROR')
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
  const response = await fetchOrNetworkError(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  const data = (await response.json().catch(() => ({}))) as ApiErrorBody & AuthTokens

  if (!response.ok) {
    throw apiErrorFromBody(response.status, data)
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

type AuthenticatedFetchOptions = ApiRequestOptions & {
  /** When true, omit default Content-Type: application/json (e.g. downloads). */
  omitJsonContentType?: boolean
}

/** Shared auth + 401 refresh retry. Returns the final Response. */
async function authenticatedFetch(
  path: string,
  options: AuthenticatedFetchOptions = {},
): Promise<Response> {
  const { accessToken, skipAuthRefresh, headers, omitJsonContentType, ...rest } = options

  const resolveToken = (override?: string | null) => {
    if (override !== undefined) return override
    return authSession?.getAccessToken() ?? null
  }

  const execute = async (token: string | null) => {
    return fetchOrNetworkError(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(omitJsonContentType ? {} : { 'Content-Type': 'application/json' }),
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

  return response
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await authenticatedFetch(path, options)

  if (response.status === 204) {
    return undefined as T
  }

  const data = (await response.json().catch(() => ({}))) as ApiErrorBody & T

  if (!response.ok) {
    throw apiErrorFromBody(response.status, data)
  }

  return data as T
}

/** Low-level refresh used by auth service; does not touch session bridge. */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return exchangeRefreshToken(refreshToken)
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export type ApiDownloadOptions = ApiRequestOptions & {
  /** Shown in the download progress panel; defaults to the fallback filename. */
  label?: string
}

const PROGRESS_INTERVAL_MS = 150

function byteHeader(response: Response, name: string): number | null {
  const value = Number(response.headers.get(name))
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Reads the body chunk by chunk so the progress panel can show bytes received. */
async function readWithProgress(response: Response, onBytes: (loaded: number) => void) {
  if (!response.body) return response.blob()
  const reader = response.body.getReader()
  const chunks: BlobPart[] = []
  let loaded = 0
  let reportedAt = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value as BlobPart)
    loaded += value.byteLength
    const now = Date.now()
    if (now - reportedAt >= PROGRESS_INTERVAL_MS) {
      reportedAt = now
      onBytes(loaded)
    }
  }
  onBytes(loaded)
  return new Blob(chunks, { type: response.headers.get('Content-Type') ?? undefined })
}

/**
 * Authenticated download (CSV, PDF, zip…) with refresh retry; triggers a browser save.
 * Progress (preparing → downloading bytes) is published to the download store.
 * Uses the server's `Content-Disposition` filename when exposed, else `fallbackFilename`.
 */
export async function apiDownload(
  path: string,
  fallbackFilename: string,
  { label, ...options }: ApiDownloadOptions = {},
): Promise<void> {
  const downloads = useDownloadStore.getState()
  const id = downloads.start(label ?? fallbackFilename)
  try {
    const response = await authenticatedFetch(path, { ...options, omitJsonContentType: true })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as ApiErrorBody
      throw apiErrorFromBody(response.status, data)
    }

    const exact = byteHeader(response, 'Content-Length')
    const estimate = exact ? null : byteHeader(response, 'X-Estimated-Size')
    downloads.update(id, {
      phase: 'downloading',
      totalBytes: exact ?? estimate,
      estimated: estimate !== null,
    })

    const filename =
      filenameFromDisposition(response.headers.get('Content-Disposition')) ?? fallbackFilename
    const blob = await readWithProgress(response, (loadedBytes) =>
      downloads.update(id, { loadedBytes }),
    )
    saveBlob(blob, filename)
  } finally {
    downloads.finish(id)
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
