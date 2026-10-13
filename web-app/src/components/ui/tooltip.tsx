import { type ReactNode, useId, useState } from 'react'

import { zIndex } from '@/theme'

type TooltipProps = {
  content: string
  children: ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          id={id}
          role="tooltip"
          style={{ zIndex: zIndex.tooltip }}
          className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow-md"
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
