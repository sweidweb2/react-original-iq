import { useCallback, useState } from 'react'

import { AsyncState } from '@/components/feedback/async-state'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { type ActivityLogItem, listActivityLogs } from '@/services/logging'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function ActivityLogsPage() {
  useDocumentTitle('Activity logs')
  const [page, setPage] = useState(1)
  const limit = 20

  const load = useCallback(() => listActivityLogs(page, limit), [page])
  const remote = useRemoteData(load)

  const rows: ActivityLogItem[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity logs</h1>
        <p className="text-sm text-muted-foreground">Business audit events (SUPER only).</p>
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No activity yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatWhen(row.createdAt)}</TableCell>
                    <TableCell className="font-medium">{row.action}</TableCell>
                    <TableCell>{row.user?.email ?? row.userId ?? '—'}</TableCell>
                    <TableCell>
                      {row.entity
                        ? `${row.entity}${row.entityId ? `:${row.entityId.slice(0, 8)}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell className="max-w-[8rem] truncate font-mono text-xs">
                      {row.requestId ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </AsyncState>
    </div>
  )
}
