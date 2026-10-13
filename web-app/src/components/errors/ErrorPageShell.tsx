import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ErrorPageShellProps = {
  title: string
  description: string
  code?: string
  actions?: ReactNode
}

export function ErrorPageShell({ title, description, code, actions }: ErrorPageShellProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-lg border border-border bg-card px-8 py-10 text-center shadow-md">
        <BrandLogo className="size-16" />
        {code ? <p className="text-sm font-semibold tracking-wide text-primary">{code}</p> : null}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actions ?? (
            <Link to="/" className={cn(buttonVariants())}>
              Back home
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
