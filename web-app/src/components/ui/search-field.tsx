import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Input } from './input'

type SearchFieldProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
}

export function SearchField({
  value,
  onValueChange,
  placeholder = 'Search',
  label = 'Search',
  className,
}: SearchFieldProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
        onChange={(event) => onValueChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          onClick={() => onValueChange('')}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
