import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  max?: number
  readOnly?: boolean
  label?: string
  className?: string
}

export function StarRating({
  value,
  onChange,
  max = 5,
  readOnly = false,
  label = 'Rating',
  className,
}: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, index) => index + 1)

  if (readOnly) {
    return (
      <div
        role="img"
        aria-label={`${label}: ${value} out of ${max}`}
        className={cn('inline-flex gap-1', className)}
      >
        {stars.map((star) => (
          <Star
            key={star}
            className={cn(
              'size-4',
              star <= value ? 'fill-warning text-warning' : 'text-muted-foreground/40',
            )}
            aria-hidden
          />
        ))}
      </div>
    )
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex gap-1', className)}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
          className="rounded-sm text-muted-foreground/40 hover:text-warning focus:ring-2 focus:ring-ring"
          onClick={() => onChange?.(star)}
        >
          <Star
            className={cn('size-5', star <= value ? 'fill-warning text-warning' : undefined)}
            aria-hidden
          />
        </button>
      ))}
    </div>
  )
}
