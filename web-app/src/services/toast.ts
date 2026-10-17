import { toast } from '@/components/ui/toast'

import { ApiError, NETWORK_ERROR_STATUS } from './api'

/**
 * Turns a failure into one safe, user-facing sentence.
 *
 * Only 4xx server messages are shown verbatim (the API writes those for end users).
 * 5xx bodies and non-API errors (JS exceptions, parse errors) never reach the UI text.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Something unexpected happened. Please try again.'
  }

  const { status, code } = error

  if (status === NETWORK_ERROR_STATUS) {
    return "Can't reach the server. Check your connection and try again."
  }
  if (status === 401) {
    return isSpecific(error.message, [
      'Authentication required',
      'Unauthorized',
      'Invalid or expired access token',
      'Invalid or expired refresh token',
    ])
      ? error.message
      : 'Your session has expired. Please sign in again.'
  }
  if (status === 403) {
    return isSpecific(error.message, ['Forbidden'])
      ? error.message
      : "You don't have permission to do this."
  }
  if (status === 404) {
    return isSpecific(error.message, ['Route not found', 'Resource not found', 'Not found'])
      ? error.message
      : 'This item no longer exists. It may have been deleted.'
  }
  if (status === 413) {
    return 'The file or request is too large.'
  }
  if (status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (status === 400 || status === 422) {
    const fields = invalidFields(error.details)
    if (fields.length > 0) {
      return `Please check: ${fields.join(', ')}.`
    }
    return isSpecific(error.message, ['Validation failed', 'Bad Request'])
      ? error.message
      : 'Some of the information is invalid. Please review it and try again.'
  }
  if (status >= 400 && status < 500) {
    return isSpecific(error.message, []) ? error.message : 'This request could not be completed.'
  }
  if (status === 503 || code === 'DB_UNAVAILABLE' || code === 'DB_NOT_CONFIGURED') {
    return 'The service is temporarily unavailable. Please try again shortly.'
  }
  return 'Something went wrong on our side. Please try again in a moment.'
}

function isSpecific(message: string, genericMessages: string[]): boolean {
  if (!message || /^Request failed \(\d+\)$/.test(message)) return false
  return !genericMessages.some((generic) => generic.toLowerCase() === message.toLowerCase())
}

/** Field names from a Zod `flatten()` payload — names only, never the submitted values. */
function invalidFields(details: unknown): string[] {
  if (!details || typeof details !== 'object') return []
  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors
  if (!fieldErrors || typeof fieldErrors !== 'object') return []
  return Object.entries(fieldErrors as Record<string, unknown>)
    .filter(([, messages]) => Array.isArray(messages) && messages.length > 0)
    .map(([field]) => humanizeField(field))
    .slice(0, 4)
}

function humanizeField(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
}

function devDiagnostics(error: unknown): string | null {
  if (!import.meta.env.DEV) return null
  if (error instanceof ApiError) {
    const parts = [
      error.status === NETWORK_ERROR_STATUS ? 'network' : `HTTP ${error.status}`,
      error.code,
      error.message,
    ].filter(Boolean)
    return parts.join(' · ')
  }
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return null
}

/**
 * Error toast: `title` says what failed ("Couldn't approve task"),
 * the body says why in safe, user-facing language.
 */
export function toastApiError(error: unknown, title = 'Something went wrong') {
  const reason = describeError(error)
  const diagnostics = devDiagnostics(error)
  toast.error(diagnostics ? `${reason}\n[dev] ${diagnostics}` : reason, { title })
}

/**
 * Error toast for failures that are not thrown API errors (e.g. a stored delivery error).
 * `rawDetail` is only appended in dev builds.
 */
export function toastFailure(title: string, reason: string, rawDetail?: string | null) {
  const diagnostics = import.meta.env.DEV && rawDetail ? `\n[dev] ${rawDetail}` : ''
  toast.error(`${reason}${diagnostics}`, { title })
}

/** Inline validation message before any request is sent. */
export function toastInvalid(title: string, reason: string) {
  toast.warning(reason, { title })
}

/** Success toast with an optional detail line ("Task approved" / "Marked as completed."). */
export function toastSuccess(title: string, detail?: string) {
  if (detail) toast.success(detail, { title })
  else toast.success(title)
}
