import { GraduationCap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

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
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40">
        <GraduationCap className="size-7 text-foreground" aria-hidden />
      </div>
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
