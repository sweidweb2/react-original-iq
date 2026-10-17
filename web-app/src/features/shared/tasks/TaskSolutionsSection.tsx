import { EmptyState } from '@/components/feedback'
import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'
import { FileUploadButton } from './FileUploadButton'
import { formatFileSize, storedFileName } from './taskDetailsFormat'
import { TaskFileRow } from './TaskFileRow'
import { TaskZipActions } from './TaskZipActions'
import type { UploadProgress } from './useTaskDetails'
import { useZipSelection } from './useZipSelection'

export function TaskSolutionsSection({
  task,
  canUpload,
  canRemove,
  canZip,
  isActing,
  uploadProgress,
  isZipping,
  onUpload,
  onOpenSolution,
  onRemoveSolution,
  onDownloadZip,
}: {
  task: TaskDetail
  canUpload: boolean
  canRemove: boolean
  canZip: boolean
  isActing: boolean
  uploadProgress: UploadProgress | null
  isZipping: boolean
  onUpload: (files: File[]) => void
  onOpenSolution: (solutionId: string) => void
  onRemoveSolution: (solutionId: string) => void
  onDownloadZip: (ids?: string[]) => Promise<boolean>
}) {
  const selection = useZipSelection(task.solutions)
  const selectable = canZip && task.solutions.length > 1

  return (
    <SectionCard
      title="Solutions"
      description="Submitted work."
      actions={
        canZip ? (
          <TaskZipActions
            total={task.solutions.length}
            selectedCount={selection.selected.length}
            busy={isZipping}
            onDownloadAll={() => void onDownloadZip()}
            onDownloadSelected={async () => {
              if (await onDownloadZip(selection.selected)) selection.clear()
            }}
          />
        ) : undefined
      }
    >
      {canUpload ? (
        <FileUploadButton
          label="Upload solution"
          progress={uploadProgress}
          disabled={isActing}
          onFiles={onUpload}
        />
      ) : null}
      {task.solutions.length === 0 ? (
        <EmptyState
          title="No solutions"
          description="Tutors and staff can upload solution files."
        />
      ) : (
        <ul className="space-y-2">
          {task.solutions.map((solution) => (
            <TaskFileRow
              key={solution.id}
              name={storedFileName(solution, 'Solution')}
              details={[formatFileSize(solution.sizeBytes)]}
              canRemove={canRemove}
              isActing={isActing}
              removeLabel="Remove solution"
              onOpen={() => onOpenSolution(solution.id)}
              onRemove={() => onRemoveSolution(solution.id)}
              selected={selection.isSelected(solution.id)}
              onToggle={selectable ? () => selection.toggle(solution.id) : undefined}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
