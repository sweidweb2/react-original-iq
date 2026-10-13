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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <BrandLogo className="size-16" />
      {code ? (
        <p className="text-sm font-medium tracking-wide text-muted-foreground">{code}</p>
      ) : null}
      <div className="max-w-md space-y-2">
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
  )
}
