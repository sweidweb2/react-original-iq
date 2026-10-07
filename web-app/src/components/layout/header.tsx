import { cn } from 'cn'
import type { ReactNode } from 'react'

type HeaderProps = {
  leading?: ReactNode
  children?: ReactNode
  trailing?: ReactNode
  className?: string
}

function Header({ leading, children, trailing, className }: HeaderProps) {
  return (
    <header
      data-slot="header"
      className={cn(
        'sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4',
        className,
      )}
    >
      {leading ? (
        <div data-slot="header-leading" className="flex items-center gap-2">
          {leading}
        </div>
      ) : null}
      <div data-slot="header-content" className="flex min-w-0 flex-1 items-center">
        {children}
      </div>
      {trailing ? (
        <div data-slot="header-trailing" className="flex items-center gap-2">
          {trailing}
        </div>
      ) : null}
    </header>
  )
}

export { Header }
export type { HeaderProps }
