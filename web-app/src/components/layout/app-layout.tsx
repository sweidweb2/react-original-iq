import { cn } from 'cn'
import type { ReactNode } from 'react'

type AppLayoutProps = {
  header?: ReactNode
  sidebar?: ReactNode
  children: ReactNode
  className?: string
}

function AppLayout({ header, sidebar, children, className }: AppLayoutProps) {
  return (
    <div
      data-slot="app-layout"
      className={cn('flex min-h-svh w-full flex-col bg-background', className)}
    >
      {header}
      <div className="flex min-h-0 flex-1">
        {sidebar}
        <main data-slot="app-layout-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

export { AppLayout }
export type { AppLayoutProps }
