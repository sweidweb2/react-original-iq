import type { LucideIcon } from 'lucide-react'

import { Tooltip } from '@/components/ui/tooltip'

type OrbitItem = {
  label: string
  icon: LucideIcon
}

export function OrbitVisual({
  color,
  items,
  label,
}: {
  color: string
  items: OrbitItem[]
  label: string
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm" role="group" aria-label={label}>
      {[18, 32, 46].map((inset) => (
        <span
          key={inset}
          aria-hidden
          className="absolute rounded-full border"
          style={{
            inset: `${inset}%`,
            borderColor: color,
            opacity: inset === 18 ? 0.25 : inset === 32 ? 0.5 : 0.8,
          }}
        />
      ))}
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
        style={{ backgroundColor: color }}
      />
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md"
        style={{ backgroundColor: color }}
      />
      {items.map((item, index) => {
        const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2
        const radius = 42
        const left = 50 + Math.cos(angle) * radius
        const top = 50 + Math.sin(angle) * radius
        const Icon = item.icon

        return (
          <div
            key={item.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <Tooltip content={item.label}>
              <button
                type="button"
                aria-label={item.label}
                className="flex size-11 items-center justify-center rounded-full border bg-card shadow-md"
                style={{ color, borderColor: color }}
              >
                <Icon className="size-5" aria-hidden />
              </button>
            </Tooltip>
          </div>
        )
      })}
    </div>
  )
}
