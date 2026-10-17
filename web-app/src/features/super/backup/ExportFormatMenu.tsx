import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BACKUP_FORMAT_OPTIONS, type BackupDataFormat } from '@/services/backups'

type ExportFormatMenuProps = {
  label?: string
  disabled?: boolean
  busy?: boolean
  onSelect: (format: BackupDataFormat) => void
}

/** Export button that opens a format picker; picking a format starts the export. */
export function ExportFormatMenu({
  label = 'Export',
  disabled,
  busy,
  onSelect,
}: ExportFormatMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
        {busy ? 'Exporting…' : label}
        {busy ? null : (
          <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} aria-hidden />
        )}
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 z-20 mt-1 w-full min-w-40 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg"
        >
          {BACKUP_FORMAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-start text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              onClick={() => {
                setOpen(false)
                onSelect(option.value)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
