import { EmptyState } from '@/components/feedback'
import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'
import { FileUploadButton } from './FileUploadButton'
import { formatFileSize, storedFileName } from './taskDetailsFormat'
import { TaskFileRow } from './TaskFileRow'

export function TaskSolutionsSection({
  task,
  canManage,
  isActing,
  isUploading,
  onUpload,
  onOpenSolution,
  onRemoveSolution,
}: {
  task: TaskDetail
  canManage: boolean
  isActing: boolean
  isUploading: boolean
  onUpload: (files: File[]) => void
  onOpenSolution: (solutionId: string) => void
  onRemoveSolution: (solutionId: string) => void
}) {
  return (
    <SectionCard title="Solutions" description="Submitted work.">
      {canManage ? (
        <FileUploadButton
          label="Upload solution"
          isUploading={isUploading}
          disabled={isActing}
          onFiles={onUpload}
        />
      ) : null}
      {task.solutions.length === 0 ? (
        <EmptyState title="No solutions" description="Tutors and staff can upload solution files." />
      ) : (
        <ul className="space-y-2">
          {task.solutions.map((solution) => (
            <TaskFileRow
              key={solution.id}
              name={storedFileName(solution, 'Solution')}
              details={[formatFileSize(solution.sizeBytes)]}
              canRemove={canManage}
              isActing={isActing}
              removeLabel="Remove solution"
              onOpen={() => onOpenSolution(solution.id)}
              onRemove={() => onRemoveSolution(solution.id)}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
