import { cn } from 'cn'
import type { ReactNode } from 'react'

type PageContainerProps = {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
  className?: string
}

const sizeClassName: Record<NonNullable<PageContainerProps['size']>, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  full: 'max-w-none',
}

function PageContainer({ children, size = 'lg', className }: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8', sizeClassName[size], className)}
    >
      {children}
    </div>
  )
}

export { PageContainer }
export type { PageContainerProps }
