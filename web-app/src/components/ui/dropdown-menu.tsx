import { type ReactNode,useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { zIndex } from '@/theme'

import { buttonVariants } from './button'

export type DropdownItem = {
  id: string
  label: string
  onSelect: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
}

type DropdownMenuProps = {
  label: ReactNode
  triggerLabel: string
  items: DropdownItem[]
  align?: 'start' | 'end'
}

export function DropdownMenu({ label, triggerLabel, items, align = 'end' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (!open) return
    itemRefs.current[0]?.focus()

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function move(next: number) {
    const index = Math.min(Math.max(next, 0), items.length - 1)
    setActive(index)
    itemRefs.current[index]?.focus()
  }

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <button
        type="button"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => {
          setActive(0)
          setOpen((value) => !value)
        }}
      >
        {label}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={triggerLabel}
          style={{ zIndex: zIndex.dropdown }}
          className={cn(
            'absolute top-full mt-2 min-w-40 rounded-md border border-border bg-card py-1 text-sm shadow-md',
            align === 'end' ? 'right-0' : 'left-0',
          )}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              move(active + 1)
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              move(active - 1)
            }
          }}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => {
                itemRefs.current[index] = node
              }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                'flex w-full px-3 py-2 text-left hover:bg-muted disabled:opacity-50',
                index === active && 'bg-muted',
                item.tone === 'danger' && 'text-destructive',
              )}
              onMouseEnter={() => setActive(index)}
              onClick={() => {
                if (item.disabled) return
                item.onSelect()
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
