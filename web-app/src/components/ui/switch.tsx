import { useId } from 'react'

import { cn } from '@/lib/utils'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  id?: string
}

export function Switch({ checked, onCheckedChange, label, disabled, id }: SwitchProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <label htmlFor={inputId} className="inline-flex items-center gap-2 text-sm">
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <span
        aria-hidden
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-primary' : 'bg-border',
          disabled && 'opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-card shadow-sm transition',
            checked ? 'left-5' : 'left-0.5',
          )}
        />
      </span>
      <span>{label}</span>
    </label>
  )
}
