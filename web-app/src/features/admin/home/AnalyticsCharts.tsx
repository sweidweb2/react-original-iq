import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export type BarItem = { key: string; label: string; value: number; className?: string }

/** Labelled horizontal bars scaled to the largest value. */
export function HorizontalBars({
  items,
  label,
  format = (value) => String(value),
}: {
  items: BarItem[]
  label: string
  format?: (value: number) => string
}) {
  const max = Math.max(1, ...items.map((item) => item.value))
  return (
    <ul className="flex flex-col gap-3" aria-label={label}>
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span>{item.label}</span>
            <span className="font-medium tabular-nums">{format(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full bg-primary', item.className)}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Vertical bars, one per period, scaled to the largest value. */
export function ColumnChart({
  items,
  label,
  barClassName,
  format = (value) => String(value),
}: {
  items: { key: string; label: string; value: number }[]
  label: string
  barClassName?: string
  format?: (value: number) => string
}) {
  const max = Math.max(1, ...items.map((item) => item.value))
  return (
    <div role="img" aria-label={label} className="flex h-44 items-end gap-2">
      {items.map((item) => (
        <div key={item.key} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium tabular-nums">{format(item.value)}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className={cn('w-full rounded-t-md bg-primary transition-all', barClassName)}
              style={{ height: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%` }}
              title={`${item.label}: ${format(item.value)}`}
            />
          </div>
          <span className="truncate text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
