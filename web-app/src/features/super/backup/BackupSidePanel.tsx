import { useState } from 'react'
import { Archive, Download, Loader2 } from 'lucide-react'

import { Field, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SectionCard } from '@/features/shared/PortalPageShell'
import type { BackupMeta, BackupType, RunBackupInput } from '@/services/backups'

import { ExportFormatMenu } from './ExportFormatMenu'

type BackupSidePanelProps = {
  meta: BackupMeta | null
  /** Backup type currently exporting from this panel, if any. */
  running: BackupType | null
  /** Locks every action (another export or re-export is in progress). */
  disabled: boolean
  onRun: (input: RunBackupInput) => void
}

function StorageNotice({ meta }: { meta: BackupMeta | null }) {
  if (!meta || meta.storage.configured) return null
  return (
    <p className="text-sm text-muted-foreground">File storage is not configured on the server.</p>
  )
}

export function BackupSidePanel({ meta, running, disabled, onRun }: BackupSidePanelProps) {
  const tables = meta?.tables ?? []
  const folders = meta?.storage.folders ?? []
  const storageReady = Boolean(meta?.storage.configured)
  const busy = disabled

  const [pickedTable, setTable] = useState('')
  const [pickedFolder, setFolder] = useState('')
  const table = pickedTable || tables[0] || ''
  const folder = pickedFolder || folders[0] || ''

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Single table" description="Back up one database table.">
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="backup-table">Table</FieldLabel>
            <Select
              id="backup-table"
              value={table}
              disabled={tables.length === 0}
              onChange={(event) => setTable(event.target.value)}
            >
              {tables.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <ExportFormatMenu
            disabled={busy || !table}
            busy={running === 'table'}
            onSelect={(format) => onRun({ type: 'table', table, format })}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="All tables"
        description="Every table in one file: a zip for CSV/JSON, one workbook for Excel, one script for SQL."
      >
        <ExportFormatMenu
          label="Export all tables"
          disabled={busy || !meta}
          busy={running === 'all_tables'}
          onSelect={(format) => onRun({ type: 'all_tables', format })}
        />
      </SectionCard>

      <SectionCard title="Image folder" description="Zip of one top-level storage folder.">
        <div className="flex flex-col gap-3">
          <StorageNotice meta={meta} />
          <Field>
            <FieldLabel htmlFor="backup-folder">Folder</FieldLabel>
            <Select
              id="backup-folder"
              value={folder}
              disabled={!storageReady || folders.length === 0}
              onChange={(event) => setFolder(event.target.value)}
            >
              {folders.length === 0 ? <option value="">No folders found</option> : null}
              {folders.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || !storageReady || !folder}
            onClick={() => onRun({ type: 'storage_folder', folder })}
          >
            {running === 'storage_folder' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Archive className="size-4" aria-hidden />
            )}
            {running === 'storage_folder' ? 'Exporting…' : 'Export folder (zip)'}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Full storage" description="Zip of every file in the storage bucket.">
        <div className="flex flex-col gap-3">
          <StorageNotice meta={meta} />
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || !storageReady}
            onClick={() => onRun({ type: 'storage_full' })}
          >
            {running === 'storage_full' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {running === 'storage_full' ? 'Exporting…' : 'Export full storage (zip)'}
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Auth users"
        description="All user accounts, including password hashes. Keep this file secure."
      >
        <ExportFormatMenu
          label="Export users"
          disabled={busy || !meta}
          busy={running === 'users'}
          onSelect={(format) => onRun({ type: 'users', format })}
        />
      </SectionCard>
    </div>
  )
}
