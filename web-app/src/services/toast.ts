import { toast } from '@/components/ui/toast'

import { ApiError } from './api'

export function toastApiError(error: unknown, fallback = 'Something went wrong') {
  const message =
    error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback
  toast.error(message)
}
