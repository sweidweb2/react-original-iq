import { cn } from 'cn'
import type { ReactNode } from 'react'

type StackProps = {
  children: ReactNode
  direction?: 'vertical' | 'horizontal'
  gap?: 'none' | 'sm' | 'md' | 'lg'
  align?: 'start' | 'center' | 'end' | 'stretch'
  className?: string
}

const gapClassName: Record<NonNullable<StackProps['gap']>, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
}

const alignClassName: Record<NonNullable<StackProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

function Stack({
  children,
  direction = 'vertical',
  gap = 'md',
  align = 'stretch',
  className,
}: StackProps) {
  return (
    <div
      data-slot="stack"
      className={cn(
        'flex',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        gapClassName[gap],
        alignClassName[align],
        className,
      )}
    >
      {children}
    </div>
  )
}

export { Stack }
export type { StackProps }
