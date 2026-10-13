import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<AlertTone, string> = {
  info: 'border-primary/40 bg-primary/10 text-foreground',
  success: 'border-chart-5/40 bg-chart-5/10 text-foreground',
  warning: 'border-accent/40 bg-accent/10 text-foreground',
  danger: 'border-destructive/40 bg-destructive/10 text-foreground',
}

const icons = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
}

type AlertProps = {
  tone?: AlertTone
  title: string
  children?: ReactNode
  className?: string
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const Icon = icons[tone]
  const live = tone === 'danger' || tone === 'warning' ? 'alert' : 'status'

  return (
    <div
      role={live}
      className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', tones[tone], className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {children ? <div className="mt-1 text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  )
}
