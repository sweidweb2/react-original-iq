import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout'
import { type BreadcrumbItem, Breadcrumbs } from '@/components/ui/breadcrumbs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

type PortalPageShellProps = {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  children: ReactNode
  className?: string
  maxWidth?: '2xl' | '4xl' | '6xl'
  hideTitle?: boolean
}

const MAX_WIDTH = {
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
} as const

export function PortalPageShell({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
  maxWidth = '6xl',
  hideTitle,
}: PortalPageShellProps) {
  useDocumentTitle(title)

  return (
    <div className={cn('mx-auto flex w-full flex-col gap-6', MAX_WIDTH[maxWidth], className)}>
      {breadcrumbs?.length ? (
        <div className="-mb-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      ) : null}
      <PageHeader title={title} description={description} actions={actions} hideTitle={hideTitle} />
      {children}
    </div>
  )
}

type SectionCardProps = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn('rounded-lg border border-border bg-card text-card-foreground', className)}
    >
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}
