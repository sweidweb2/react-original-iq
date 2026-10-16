import type { ReactNode } from 'react'

import { Tooltip } from '@/components/ui/tooltip'

export function formatAdminDate(iso: string, withTime = false): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

export function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted"
      >
        {children}
      </button>
    </Tooltip>
  )
}
