import { type InputHTMLAttributes, useId } from 'react'

import { cn } from '@/lib/utils'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
}

export function Checkbox({ label, id, className, ...props }: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <label htmlFor={inputId} className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <input id={inputId} type="checkbox" className="size-4 accent-primary" {...props} />
      <span>{label}</span>
    </label>
  )
}
