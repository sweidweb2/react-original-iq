import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { zIndex } from '@/theme'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export type ToastOptions = {
  title?: string
  /** Milliseconds before auto-dismiss. `Infinity` (or `<= 0`) keeps the toast until closed. */
  duration?: number
}

type ToastItem = {
  id: number
  message: string
  title?: string
  variant: ToastVariant
  duration: number
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
}

const MAX_TOASTS = 4

let nextId = 1
let items: ToastItem[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function push(message: string, variant: ToastVariant, options: ToastOptions = {}): number {
  const id = nextId++
  const item: ToastItem = {
    id,
    message,
    title: options.title,
    variant,
    duration: options.duration ?? DEFAULT_DURATION[variant],
  }
  items = [...items, item].slice(-MAX_TOASTS)
  emit()
  return id
}

function dismiss(id?: number) {
  items = id === undefined ? [] : items.filter((item) => item.id !== id)
  emit()
}

export const toast = {
  show(message: string, variant: ToastVariant = 'info', options?: ToastOptions) {
    return push(message, variant, options)
  },
  success(message: string, options?: ToastOptions) {
    return push(message, 'success', options)
  },
  error(message: string, options?: ToastOptions) {
    return push(message, 'error', options)
  },
  warning(message: string, options?: ToastOptions) {
    return push(message, 'warning', options)
  },
  info(message: string, options?: ToastOptions) {
    return push(message, 'info', options)
  },
  /** Dismiss one toast by id, or all toasts when called without arguments. */
  dismiss,
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return items
}

const variants: Record<ToastVariant, { icon: typeof Info; badge: string; bar: string }> = {
  success: { icon: CircleCheck, badge: 'bg-chart-5/10 text-chart-5', bar: 'bg-chart-5' },
  error: { icon: CircleAlert, badge: 'bg-destructive/10 text-destructive', bar: 'bg-destructive' },
  warning: { icon: TriangleAlert, badge: 'bg-warning/15 text-warning', bar: 'bg-warning' },
  info: { icon: Info, badge: 'bg-primary/10 text-primary', bar: 'bg-primary' },
}

function isTimed(duration: number) {
  return Number.isFinite(duration) && duration > 0
}

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(item.duration)
  const timed = isTimed(item.duration)
  const { icon: Icon, badge, bar } = variants[item.variant]
  const urgent = item.variant === 'error' || item.variant === 'warning'

  useEffect(() => {
    if (!timed || paused) return
    const startedAt = Date.now()
    const timer = window.setTimeout(() => dismiss(item.id), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - startedAt
    }
  }, [item.id, timed, paused])

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border border-border bg-card p-3.5 text-card-foreground shadow-lg animate-[toast-in_200ms_ease-out] motion-reduce:animate-none"
    >
      <span
        className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', badge)}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 py-1.5 text-sm">
        {item.title ? <p className="font-semibold">{item.title}</p> : null}
        <p
          className={cn(
            'whitespace-pre-line break-words',
            item.title && 'mt-0.5 text-muted-foreground',
          )}
        >
          {item.message}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(item.id)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X className="size-4" />
      </button>
      {timed ? (
        <span
          aria-hidden
          className={cn('absolute inset-x-0 bottom-0 h-0.5 ltr:origin-left rtl:origin-right', bar)}
          style={{
            animation: `toast-progress ${item.duration}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      ) : null}
    </div>
  )
}

export function Toaster() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 bottom-4 flex flex-col gap-2 sm:inset-x-auto sm:end-4 sm:w-96"
      style={{ zIndex: zIndex.toast }}
    >
      {current.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </section>
  )
}
