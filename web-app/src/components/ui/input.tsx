import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

import { fieldControlClass } from './control'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(fieldControlClass, 'h-10', className)} {...props} />
}
