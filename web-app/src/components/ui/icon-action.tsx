import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Tooltip } from './tooltip'

const tones = {
  default: 'border-border bg-card text-foreground hover:bg-muted',
  danger:
    'border-destructive/30 bg-card text-destructive hover:border-destructive hover:bg-destructive hover:text-white',
} as const

export type IconActionTone = keyof typeof tones

export function IconAction({
  label,
  onClick,
  disabled,
  tone = 'default',
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: IconActionTone
  children: ReactNode
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40',
          tones[tone],
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}
