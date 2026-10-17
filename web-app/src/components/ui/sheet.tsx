import { type ReactNode, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { zIndex } from '@/theme'

import { useOverlay } from './use-overlay'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Pinned below the scrollable body. */
  footer?: ReactNode
  side?: 'start' | 'end'
}

export function Sheet({ open, onClose, title, children, footer, side = 'end' }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useOverlay(open, panelRef, onClose)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: zIndex.overlay }}>
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 flex w-full max-w-sm flex-col bg-card text-card-foreground shadow-lg outline-none',
          side === 'start' ? 'start-0 border-e border-border' : 'end-0 border-s border-border',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-border px-4 py-4">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
