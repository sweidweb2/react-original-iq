import { cn } from 'cn'
import type { ReactNode } from 'react'

type NavItem = {
  id: string
  label: ReactNode
  href?: string
  icon?: ReactNode
  active?: boolean
  disabled?: boolean
  onSelect?: () => void
}

type NavProps = {
  items: NavItem[]
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

function Nav({ items, orientation = 'vertical', className }: NavProps) {
  return (
    <nav
      data-slot="nav"
      data-orientation={orientation}
      className={cn(
        'flex gap-1',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap items-center',
        className,
      )}
    >
      {items.map((item) => {
        const className = cn(
          'inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none',
          'hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
          item.active && 'bg-muted text-foreground',
          item.disabled && 'pointer-events-none opacity-50',
        )

        if (item.href) {
          return (
            <a
              key={item.id}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              aria-disabled={item.disabled || undefined}
              className={className}
              onClick={(event) => {
                if (item.disabled) {
                  event.preventDefault()
                  return
                }
                item.onSelect?.()
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          )
        }

        return (
          <button
            key={item.id}
            type="button"
            aria-current={item.active ? 'page' : undefined}
            disabled={item.disabled}
            className={className}
            onClick={item.onSelect}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export { Nav }
export type { NavItem, NavProps }
