import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/services/api'

type AsyncStateProps = {
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  loadingFallback?: ReactNode
  children: ReactNode
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}

export function AsyncState({
  isLoading,
  error,
  onRetry,
  loadingFallback,
  children,
}: AsyncStateProps) {
  if (isLoading) {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label="Loading">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-24 w-full animate-pulse rounded bg-muted" />
          </div>
        )}
      </>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive px-4 py-3 text-sm" role="alert">
        <p className="font-medium text-destructive">Could not load</p>
        <p className="mt-1 text-foreground">{errorMessage(error)}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    )
  }

  return <>{children}</>
}

export function InlineSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground"
      role="status"
      aria-busy="true"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
