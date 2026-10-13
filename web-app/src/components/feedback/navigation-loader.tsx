import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { zIndex } from '@/theme'

const RUN_MS = 500

/** Thin bar at the top of the viewport. Runs once per client navigation. */
export function NavigationLoader() {
  const location = useLocation()
  const skipFirst = useRef(true)
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }

    setVisible(true)
    setProgress(18)

    const grow = window.setTimeout(() => setProgress(100), 30)
    const hide = window.setTimeout(() => setVisible(false), RUN_MS)

    return () => {
      window.clearTimeout(grow)
      window.clearTimeout(hide)
    }
  }, [location.key])

  if (!visible) return null

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className="pointer-events-none fixed inset-x-0 top-0 h-[3px]"
      style={{ zIndex: zIndex.tooltip }}
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-primary to-primary-light shadow-[var(--shadow-primary)] transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  )
}
