import { DatabaseBackup, Loader2, RotateCw } from 'lucide-react'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Badge } from '@/components/ui/badge'
import { IconAction } from '@/components/ui/icon-action'
import { AdminListPagination } from '@/features/admin/_shared/AdminListPagination'
import type { BackupHistoryEntry, BackupHistoryMeta, BackupStatus } from '@/services/backups'

import {
  BACKUP_TYPE_LABELS,
  formatBytes,
  formatTarget,
  formatVolume,
  formatWhen,
} from './backupFormat'

const STATUS_TONE: Record<BackupStatus, 'success' | 'warning' | 'danger'> = {
  completed: 'success',
  running: 'warning',
  failed: 'danger',
}

type BackupHistoryTableProps = {
  entries: BackupHistoryEntry[]
  meta: BackupHistoryMeta | null
  page: number
  isLoading: boolean
  error: unknown
  rerunningId: string | null
  disableActions: boolean
  onRetry: () => void
  onPageChange: (page: number) => void
  onRerun: (entry: BackupHistoryEntry) => void
}

export function BackupHistoryTable({
  entries,
  meta,
  page,
  isLoading,
  error,
  rerunningId,
  disableActions,
  onRetry,
  onPageChange,
  onRerun,
}: BackupHistoryTableProps) {
  const limit = meta?.limit ?? 1
  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / limit))
  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const rangeEnd = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  return (
    <AsyncState
      isLoading={isLoading && !meta}
      error={error}
      onRetry={onRetry}
      loadingFallback={
        <div className="flex flex-col gap-2" role="status" aria-label="Loading backup history">
          <div className="h-10 animate-pulse rounded bg-muted" />
          <div className="h-10 animate-pulse rounded bg-muted" />
          <div className="h-10 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={<DatabaseBackup className="size-6" aria-hidden />}
          title="No backups yet"
          description="Exports you run from the panel appear here. Only export details are saved, never the exported data."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[860px] text-start text-sm">
            <caption className="sr-only">Backup history</caption>
            <thead className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 text-start font-medium">When</th>
                <th className="px-3 py-2 text-start font-medium">Type</th>
                <th className="px-3 py-2 text-start font-medium">Target</th>
                <th className="px-3 py-2 text-start font-medium">Format</th>
                <th className="px-3 py-2 text-start font-medium">Status</th>
                <th className="px-3 py-2 text-end font-medium">Size</th>
                <th className="px-3 py-2 text-end font-medium">Contents</th>
                <th className="px-3 py-2 text-start font-medium">By</th>
                <th className="px-3 py-2 text-end font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                    {formatWhen(entry.createdAt)}
                    {entry.rerunOf ? (
                      <span className="ms-2 text-xs text-muted-foreground">(re-export)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{BACKUP_TYPE_LABELS[entry.type]}</td>
                  <td className="max-w-[180px] truncate px-3 py-3 font-mono text-xs">
                    {formatTarget(entry)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone="neutral">{entry.format.toUpperCase()}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={STATUS_TONE[entry.status]} title={entry.error ?? undefined}>
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-end whitespace-nowrap tabular-nums">
                    {formatBytes(entry.sizeBytes)}
                  </td>
                  <td className="px-3 py-3 text-end whitespace-nowrap tabular-nums">
                    {formatVolume(entry)}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-3 text-muted-foreground">
                    {entry.requestedBy?.name || entry.requestedBy?.email || '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <IconAction
                        label="Re-export"
                        disabled={disableActions}
                        onClick={() => onRerun(entry)}
                      >
                        {rerunningId === entry.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <RotateCw className="size-4" aria-hidden />
                        )}
                      </IconAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <AdminListPagination
          page={page}
          meta={meta}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={onPageChange}
        />
      </div>
    </AsyncState>
  )
}
