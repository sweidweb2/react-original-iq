import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-foreground',
  primary: 'bg-primary/15 text-primary-dark',
  success: 'bg-chart-5/15 text-chart-5',
  warning: 'bg-accent/15 text-accent',
  danger: 'bg-destructive/15 text-destructive',
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
