import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

export type SidebarItem = {
  to: string
  label: string
  icon?: LucideIcon
  end?: boolean
}

type SidebarProps = {
  items: SidebarItem[]
  header?: ReactNode
  footer?: ReactNode
  label?: string
  onNavigate?: () => void
  className?: string
}

export function Sidebar({
  items,
  header,
  footer,
  label = 'Sidebar',
  onNavigate,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      {header ? <div className="border-b border-sidebar-border px-3 py-3">{header}</div> : null}
      <nav aria-label={label} className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-2 rounded-lg px-3 text-sm',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/70',
              )
            }
          >
            {item.icon ? <item.icon className="size-4 shrink-0" aria-hidden /> : null}
            {item.label}
          </NavLink>
        ))}
      </nav>
      {footer ? <div className="border-t border-sidebar-border p-3">{footer}</div> : null}
    </aside>
  )
}
