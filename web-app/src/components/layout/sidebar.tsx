import { cn } from 'cn'
import type { ReactNode } from 'react'

type SidebarProps = {
  children?: ReactNode
  footer?: ReactNode
  collapsed?: boolean
  className?: string
}

function Sidebar({ children, footer, collapsed = false, className }: SidebarProps) {
  return (
    <aside
      data-slot="sidebar"
      data-collapsed={collapsed || undefined}
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground',
        collapsed ? 'w-14' : 'w-60',
        className,
      )}
    >
      <div data-slot="sidebar-content" className="flex-1 overflow-y-auto p-2">
        {children}
      </div>
      {footer ? (
        <div data-slot="sidebar-footer" className="border-t border-sidebar-border p-2">
          {footer}
        </div>
      ) : null}
    </aside>
  )
}

export { Sidebar }
export type { SidebarProps }
