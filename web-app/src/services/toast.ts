import { toast } from 'sonner'

import { ApiError } from '@/services/api'

/** Non-blocking toast for API / mutation failures. */
export function toastApiError(error: unknown, fallback = 'Something went wrong') {
  const message =
    error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback
  toast.error(message)
}
