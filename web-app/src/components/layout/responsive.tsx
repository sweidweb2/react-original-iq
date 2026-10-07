import { cn } from 'cn'
import type { ReactNode } from 'react'

type ShowProps = {
  children: ReactNode
  above?: 'sm' | 'md' | 'lg' | 'xl'
  below?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const aboveClassName: Record<NonNullable<ShowProps['above']>, string> = {
  sm: 'hidden sm:block',
  md: 'hidden md:block',
  lg: 'hidden lg:block',
  xl: 'hidden xl:block',
}

const belowClassName: Record<NonNullable<ShowProps['below']>, string> = {
  sm: 'block sm:hidden',
  md: 'block md:hidden',
  lg: 'block lg:hidden',
  xl: 'block xl:hidden',
}

/**
 * Responsive visibility helper. Prefer one of `above` or `below`.
 */
function Show({ children, above, below, className }: ShowProps) {
  return (
    <div
      data-slot="show"
      className={cn(
        above ? aboveClassName[above] : null,
        below ? belowClassName[below] : null,
        className,
      )}
    >
      {children}
    </div>
  )
}

type FlexProps = {
  children: ReactNode
  className?: string
}

/** Row that stacks on small screens and goes horizontal from `md` up. */
function ResponsiveRow({ children, className }: FlexProps) {
  return (
    <div
      data-slot="responsive-row"
      className={cn('flex flex-col gap-4 md:flex-row md:items-center', className)}
    >
      {children}
    </div>
  )
}

export { ResponsiveRow, Show }
export type { FlexProps, ShowProps }
