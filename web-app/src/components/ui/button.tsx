import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'inverse'
type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-[var(--shadow-primary)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-primary-hover)]',
  outline:
    'border-[1.5px] border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground',
  danger: 'bg-destructive text-white shadow-sm hover:opacity-90',
  inverse:
    'bg-white text-primary shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:bg-white hover:text-primary-dark hover:shadow-[0_6px_30px_rgba(0,0,0,0.3)]',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-8 text-base',
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
