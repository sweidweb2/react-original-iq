import { InlineSpinner } from './async-state'

/** Shown inside a layout while a lazily loaded page chunk downloads. */
export function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <InlineSpinner />
    </div>
  )
}
