import { EmptyState } from '@/components/feedback'
import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'
import { FileUploadButton } from './FileUploadButton'
import { formatFileSize, storedFileName } from './taskDetailsFormat'
import { TaskFileRow } from './TaskFileRow'

export function TaskDocumentsSection({
  task,
  canUpload,
  isActing,
  isUploading,
  onUpload,
  onOpenFile,
  onRemoveFile,
}: {
  task: TaskDetail
  canUpload: boolean
  isActing: boolean
  isUploading: boolean
  onUpload: (files: File[]) => void
  onOpenFile: (fileId: string) => void
  onRemoveFile: (fileId: string) => void
}) {
  return (
    <SectionCard title="Documents" description="Task files shared by the client and staff.">
      {canUpload ? (
        <FileUploadButton
          label="Upload file"
          isUploading={isUploading}
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
            />
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
