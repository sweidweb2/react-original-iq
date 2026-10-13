import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring',
        className,
      )}
      {...props}
    />
  )
}
