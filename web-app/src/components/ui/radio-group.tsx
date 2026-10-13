import { cn } from '@/lib/utils'

export type RadioOption = {
  value: string
  label: string
  description?: string
}

type RadioGroupProps = {
  name: string
  value: string
  onChange: (value: string) => void
  options: RadioOption[]
  legend?: string
  className?: string
}

export function RadioGroup({ name, value, onChange, options, legend, className }: RadioGroupProps) {
  return (
    <fieldset className={cn('min-w-0 border-0 p-0', className)}>
      {legend ? <legend className="mb-2 text-sm font-medium">{legend}</legend> : null}
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              className="mt-0.5 size-4 accent-primary"
              onChange={() => onChange(option.value)}
            />
            <span>
              <span className="block text-foreground">{option.label}</span>
              {option.description ? (
                <span className="block text-muted-foreground">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
