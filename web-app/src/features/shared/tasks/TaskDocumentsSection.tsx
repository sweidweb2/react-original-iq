import type { FormEvent } from 'react'

import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'

export function TaskDocumentsSection({
  task,
  canUpload,
  isActing,
  fileLocation,
  fileNote,
  onFileLocationChange,
  onFileNoteChange,
  onAddFile,
  onRemoveFile,
}: {
  task: TaskDetail
  canUpload: boolean
  isActing: boolean
  fileLocation: string
  fileNote: string
  onFileLocationChange: (value: string) => void
  onFileNoteChange: (value: string) => void
  onAddFile: (event: FormEvent) => void
  onRemoveFile: (fileId: string) => void
}) {
  return (
    <SectionCard title="Documents" description="Task files (URL or storage path).">
      {canUpload ? (
        <form className="mb-4 grid gap-2" onSubmit={onAddFile}>
          <Input
            placeholder="File location URL"
            value={fileLocation}
            onChange={(e) => onFileLocationChange(e.target.value)}
          />
          <Input
            placeholder="Note (optional)"
            value={fileNote}
            onChange={(e) => onFileNoteChange(e.target.value)}
          />
          <Button type="submit" size="sm" variant="outline" disabled={isActing}>
            Upload file
          </Button>
        </form>
      ) : null}
      {task.files.length === 0 ? (
        <EmptyState title="No documents" description="Upload files using a storage URL." />
      ) : (
        <ul className="space-y-2 text-sm">
          {task.files.map((file) => (
            <li key={file.id} className="flex items-start justify-between gap-2 rounded-md border p-2">
              <div>
                <a
                  href={file.fileLocation}
                  className="font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.fileLocation}
                </a>
                {file.note ? <p className="text-xs text-muted-foreground">{file.note}</p> : null}
              </div>
              {canUpload ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActing}
                  onClick={() => onRemoveFile(file.id)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
