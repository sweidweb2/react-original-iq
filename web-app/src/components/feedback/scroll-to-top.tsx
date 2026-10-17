import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Resets window scroll when the path changes. Hash links keep their own anchor scrolling. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    if (hash) return
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
