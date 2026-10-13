import type { FormHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function Form({ className, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return <form className={cn('flex flex-col gap-4', className)} {...props} />
}

export function FieldGroup({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex flex-col gap-3', className)}>{children}</div>
}

export function Field({
  className,
  children,
}: {
  className?: string
  children: ReactNode
  'data-invalid'?: boolean
}) {
  return <div className={cn('flex flex-col gap-1.5', className)}>{children}</div>
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-medium text-foreground', className)} {...props} />
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <p className="text-sm text-destructive">{children}</p>
}
