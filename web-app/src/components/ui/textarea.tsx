import type { TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

import { fieldControlClass } from './control'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(fieldControlClass, 'min-h-24 py-2', className)} {...props} />
}
