import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Input } from './input'

type SearchFieldProps = {
  id?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  label?: string
  clearLabel?: string
  className?: string
}

export function SearchField({
  id,
  value,
  onValueChange,
  placeholder = 'Search',
  label = 'Search',
  clearLabel = 'Clear search',
  className,
}: SearchFieldProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        className="ps-9 pe-9 [&::-webkit-search-cancel-button]:appearance-none"
        onChange={(event) => onValueChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label={clearLabel}
          className="absolute top-1/2 end-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          onClick={() => onValueChange('')}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
