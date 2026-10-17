import { FileText, Trash2 } from 'lucide-react'

import { IconAction } from '@/components/ui/icon-action'

export function TaskFileRow({
  name,
  details,
  canRemove,
  isActing,
  removeLabel,
  onOpen,
  onRemove,
}: {
  name: string
  details: (string | null | undefined)[]
  canRemove: boolean
  isActing: boolean
  removeLabel: string
  onOpen: () => void
  onRemove: () => void
}) {
  const meta = details.filter(Boolean).join(' · ')

  return (
    <li className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileText className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full truncate text-start text-sm font-medium text-foreground hover:text-primary hover:underline"
        >
          {name}
        </button>
        {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      {canRemove ? (
        <IconAction label={removeLabel} tone="danger" disabled={isActing} onClick={onRemove}>
          <Trash2 className="size-4" aria-hidden />
        </IconAction>
      ) : null}
    </li>
  )
}
