import { EmptyState } from '@/components/feedback'
import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'
import { FileUploadButton } from './FileUploadButton'
import { formatFileSize, storedFileName } from './taskDetailsFormat'
import { TaskFileRow } from './TaskFileRow'
import { TaskZipActions } from './TaskZipActions'
import type { UploadProgress } from './useTaskDetails'
import { useZipSelection } from './useZipSelection'

export function TaskDocumentsSection({
  task,
  canUpload,
  isActing,
  uploadProgress,
  isZipping,
  onUpload,
  onOpenFile,
  onRemoveFile,
  onDownloadZip,
}: {
  task: TaskDetail
  canUpload: boolean
  isActing: boolean
  uploadProgress: UploadProgress | null
  isZipping: boolean
  onUpload: (files: File[]) => void
  onOpenFile: (fileId: string) => void
  onRemoveFile: (fileId: string) => void
  onDownloadZip: (ids?: string[]) => Promise<boolean>
}) {
  const selection = useZipSelection(task.files)
  const selectable = task.files.length > 1

  return (
    <SectionCard
      title="Documents"
      description="Task files shared by the client and staff."
      actions={
        <TaskZipActions
          total={task.files.length}
          selectedCount={selection.selected.length}
          busy={isZipping}
          onDownloadAll={() => void onDownloadZip()}
          onDownloadSelected={async () => {
            if (await onDownloadZip(selection.selected)) selection.clear()
          }}
        />
      }
    >
      {canUpload ? (
        <FileUploadButton
          label="Upload file"
          progress={uploadProgress}
          disabled={isActing}
          onFiles={onUpload}
        />
      ) : null}
      {task.files.length === 0 ? (
        <EmptyState title="No documents" description="Uploaded task files will appear here." />
      ) : (
        <ul className="space-y-2">
          {task.files.map((file) => (
            <TaskFileRow
              key={file.id}
              name={storedFileName(file, 'Document')}
              details={[formatFileSize(file.sizeBytes), file.note]}
              canRemove={canUpload}
              isActing={isActing}
              removeLabel="Remove document"
              onOpen={() => onOpenFile(file.id)}
              onRemove={() => onRemoveFile(file.id)}
              selected={selection.isSelected(file.id)}
              onToggle={selectable ? () => selection.toggle(file.id) : undefined}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
