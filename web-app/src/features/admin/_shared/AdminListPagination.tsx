import { Button } from '@/components/ui/button'
import type { ContactListMeta } from '@/services/contact'

export function AdminListPagination({
  page,
  meta,
  totalPages,
  rangeStart,
  rangeEnd,
  onPageChange,
}: {
  page: number
  meta: ContactListMeta | null
  totalPages: number
  rangeStart: number
  rangeEnd: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {meta && meta.total > 0
          ? `Showing ${rangeStart}–${rangeEnd} of ${meta.total}`
          : 'No results'}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {meta?.page ?? page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
