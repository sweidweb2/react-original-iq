import { useMemo, useState } from 'react'

/** Checkbox selection for a file list; ids that disappear from the list are ignored. */
export function useZipSelection(items: { id: string }[]) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const selected = useMemo(
    () => items.map((item) => item.id).filter((id) => picked.has(id)),
    [items, picked],
  )

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return {
    selected,
    isSelected: (id: string) => picked.has(id),
    toggle,
    clear: () => setPicked(new Set()),
  }
}
