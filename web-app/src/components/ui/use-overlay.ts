import { type RefObject, useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

let scrollLockCount = 0
let savedBodyOverflow = ''
let savedBodyPaddingRight = ''

/** Hide page scroll while keeping the scrollbar's width so the layout does not jump. */
function lockPageScroll(): () => void {
  if (scrollLockCount === 0) {
    const body = document.body
    const gap = window.innerWidth - document.documentElement.clientWidth
    savedBodyOverflow = body.style.overflow
    savedBodyPaddingRight = body.style.paddingRight
    body.style.overflow = 'hidden'
    if (gap > 0) {
      const current = Number.parseFloat(getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${current + gap}px`
    }
  }
  scrollLockCount += 1

  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1)
    if (scrollLockCount > 0) return
    document.body.style.overflow = savedBodyOverflow
    document.body.style.paddingRight = savedBodyPaddingRight
  }
}

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
    const unlockScroll = lockPageScroll()

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
      unlockScroll()
      previous?.focus()
    }
  }, [open, panelRef])
}
