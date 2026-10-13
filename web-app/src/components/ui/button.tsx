import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-[var(--shadow-primary)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-primary-hover)]',
  outline:
    'border-[1.5px] border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground',
  danger: 'bg-destructive text-white shadow-sm hover:opacity-90',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
}

export function buttonVariants(options?: { variant?: ButtonVariant; size?: ButtonSize }): string {
  const variant = options?.variant ?? 'primary'
  const size = options?.size ?? 'md'
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition duration-200 ease-out disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50',
    variants[variant],
    sizes[size],
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}
