import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function TaskZipActions({
  total,
  selectedCount,
  busy,
  onDownloadAll,
  onDownloadSelected,
}: {
  total: number
  selectedCount: number
  busy: boolean
  onDownloadAll: () => void
  onDownloadSelected: () => void
}) {
  if (total < 2 && selectedCount === 0) return null
  const icon = busy ? (
    <Loader2 className="size-4 animate-spin" aria-hidden />
  ) : (
    <Download className="size-4" aria-hidden />
  )

  return (
    <>
      {selectedCount > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onDownloadSelected}
        >
          {icon}
          Download selected ({selectedCount})
        </Button>
      ) : null}
      {total >= 2 ? (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onDownloadAll}>
          {icon}
          Download all
        </Button>
      ) : null}
    </>
  )
}
