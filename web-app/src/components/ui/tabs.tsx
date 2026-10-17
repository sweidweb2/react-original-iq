import { type KeyboardEvent, type ReactNode, useRef } from 'react'

import { cn } from '@/lib/utils'

export type TabItem<T extends string> = {
  id: T
  label: string
  count?: number
}

type TabsProps<T extends string> = {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  idPrefix: string
  className?: string
}

export function tabIds(idPrefix: string, id: string) {
  return { tab: `${idPrefix}-tab-${id}`, panel: `${idPrefix}-panel-${id}` }
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  function focusTab(index: number) {
    const item = items[(index + items.length) % items.length]
    if (!item) return
    onChange(item.id)
    listRef.current
      ?.querySelector<HTMLButtonElement>(`#${CSS.escape(tabIds(idPrefix, item.id).tab)}`)
      ?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = items.findIndex((item) => item.id === value)
    const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const step = isRtl ? -1 : 1
    if (event.key === 'ArrowRight') focusTab(current + step)
    else if (event.key === 'ArrowLeft') focusTab(current - step)
    else if (event.key === 'Home') focusTab(0)
    else if (event.key === 'End') focusTab(items.length - 1)
    else return
    event.preventDefault()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}
    >
      {items.map((item) => {
        const active = item.id === value
        const ids = tabIds(idPrefix, item.id)
        return (
          <button
            key={item.id}
            id={ids.tab}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={ids.panel}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  idPrefix,
  id,
  children,
  className,
}: {
  idPrefix: string
  id: string
  children: ReactNode
  className?: string
}) {
  const ids = tabIds(idPrefix, id)
  return (
    <div
      id={ids.panel}
      role="tabpanel"
      aria-labelledby={ids.tab}
      tabIndex={0}
      className={cn('flex flex-col gap-6 focus-visible:outline-none', className)}
    >
      {children}
    </div>
  )
}
