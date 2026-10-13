import { type RefObject, useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** Scroll lock, Escape to close, and a tab cycle inside the panel. */
export function useOverlay(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function focusable() {
      if (!panel) return []
      return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    }

    const first = focusable()[0]
    if (first) first.focus()
    else panel?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const list = focusable()
      if (list.length === 0) {
        event.preventDefault()
        return
      }
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      if (!firstEl || !lastEl) return
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault()
        lastEl.focus()
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [open, panelRef])
}
