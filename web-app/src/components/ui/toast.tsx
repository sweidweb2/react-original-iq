import { useSyncExternalStore } from 'react'

type ToastTone = 'success' | 'error'

type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

let nextId = 1
let items: ToastItem[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function push(message: string, tone: ToastTone) {
  const id = nextId++
  items = [...items, { id, message, tone }]
  emit()
  window.setTimeout(() => {
    items = items.filter((item) => item.id !== id)
    emit()
  }, 3200)
}

export const toast = {
  success(message: string) {
    push(message, 'success')
  },
  error(message: string) {
    push(message, 'error')
  },
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return items
}

export function Toaster() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  if (current.length === 0) return null

  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
      {current.map((item) => (
        <div
          key={item.id}
          role="status"
          className={
            item.tone === 'error'
              ? 'rounded-lg border border-destructive bg-card px-3 py-2 text-sm text-destructive shadow'
              : 'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow'
          }
        >
          {item.message}
        </div>
      ))}
    </div>
  )
}
