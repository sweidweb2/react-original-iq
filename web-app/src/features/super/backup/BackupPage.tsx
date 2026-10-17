import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { PortalPageShell, SectionCard } from '@/features/shared/PortalPageShell'
import {
  type BackupHistoryEntry,
  type BackupHistoryMeta,
  type BackupMeta,
  type BackupType,
  getBackupMeta,
  listBackupHistory,
  rerunBackup,
  runBackup,
  type RunBackupInput,
} from '@/services/backups'
import { toastApiError, toastSuccess } from '@/services/toast'

import { BACKUP_TYPE_LABELS, formatTarget } from './backupFormat'
import { BackupHistoryTable } from './BackupHistoryTable'
import { BackupSidePanel } from './BackupSidePanel'

const PAGE_SIZE = 20

type History = {
  entries: BackupHistoryEntry[]
  meta: BackupHistoryMeta
}

export function BackupPage() {
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [history, setHistory] = useState<History | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const [meta, setMeta] = useState<BackupMeta | null>(null)
  const [running, setRunning] = useState<BackupType | null>(null)
  const [rerunningId, setRerunningId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getBackupMeta()
      .then((result) => {
        if (!cancelled) setMeta(result)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) toastApiError(loadError, "Couldn't load backup options")
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    listBackupHistory(page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return
        const totalPages = Math.max(1, Math.ceil(result.meta.total / result.meta.limit))
        if (page > totalPages) {
          setPage(totalPages)
          return
        }
        setHistory({ entries: result.data, meta: result.meta })
        setIsLoading(false)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(loadError)
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, reloadKey])

  function refresh() {
    setReloadKey((value) => value + 1)
  }

  async function handleRun(input: RunBackupInput) {
    setRunning(input.type)
    try {
      await runBackup(input)
      toastSuccess(
        'Backup downloaded',
        `${BACKUP_TYPE_LABELS[input.type]} backup saved to your downloads.`,
      )
    } catch (runError) {
      toastApiError(runError, `${BACKUP_TYPE_LABELS[input.type]} backup failed`)
    } finally {
      setRunning(null)
      setPage(1)
      refresh()
    }
  }

  async function handleRerun(entry: BackupHistoryEntry) {
    setRerunningId(entry.id)
    try {
      await rerunBackup(
        entry.id,
        `Re-export · ${formatTarget(entry)} (${entry.format.toUpperCase()})`,
      )
      toastSuccess(
        'Backup re-exported',
        `${BACKUP_TYPE_LABELS[entry.type]} backup saved to your downloads.`,
      )
    } catch (rerunError) {
      toastApiError(rerunError, `Couldn't re-export the ${BACKUP_TYPE_LABELS[entry.type]} backup`)
    } finally {
      setRerunningId(null)
      setPage(1)
      refresh()
    }
  }

  const busy = running !== null || rerunningId !== null

  return (
    <PortalPageShell
      title="Backup"
      description="Export database tables, storage files, and user accounts. History keeps export details only."
      actions={
        <Button type="button" variant="secondary" onClick={refresh}>
          Refresh
        </Button>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard
          title="Backup history"
          description="Every export with its result. Use re-export to download a fresh copy with the same settings."
        >
          <BackupHistoryTable
            entries={history?.entries ?? []}
            meta={history?.meta ?? null}
            page={page}
            isLoading={isLoading}
            error={error}
            rerunningId={rerunningId}
            disableActions={busy}
            onRetry={refresh}
            onPageChange={setPage}
            onRerun={handleRerun}
          />
        </SectionCard>

        <aside className="lg:sticky lg:top-4" aria-label="Backup actions">
          <BackupSidePanel meta={meta} running={running} disabled={busy} onRun={handleRun} />
        </aside>
      </div>
    </PortalPageShell>
  )
}
