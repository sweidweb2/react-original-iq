import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  hideTitle?: boolean
}

export function PageHeader({ title, description, actions, className, hideTitle }: PageHeaderProps) {
  if (hideTitle) {
    return (
      <>
        <h1 className="sr-only">{title}</h1>
        {actions ? (
          <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
            {actions}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
