import { Pencil, Trash2 } from 'lucide-react'

import { IconAction } from '@/components/ui/icon-action'
import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'
import { formatTaskDate } from './taskDetailsFormat'
export function TaskInfoSection({
  task,
  canEdit,
  canDelete,
  isActing,
  onEdit,
  onDelete,
}: {
  task: TaskDetail
  canEdit: boolean
  canDelete: boolean
  isActing: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <SectionCard
      title="Task information"
      description="Description and metadata."
      actions={
        canEdit || canDelete ? (
          <>
            {canEdit ? (
              <IconAction label="Edit details" onClick={onEdit}>
                <Pencil className="size-4" aria-hidden />
              </IconAction>
            ) : null}
            {canDelete ? (
              <IconAction label="Delete task" tone="danger" disabled={isActing} onClick={onDelete}>
                <Trash2 className="size-4" aria-hidden />
              </IconAction>
            ) : null}
          </>
        ) : undefined
      }
    >
      <h3 className="text-base font-semibold text-foreground">{task.topic ?? 'Untitled task'}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{task.description ?? '—'}</p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Type</dt>
          <dd>{task.type ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Category</dt>
          <dd>{task.category ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tutor</dt>
          <dd>{task.tutorId ? 'Assigned' : 'Unassigned'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatTaskDate(task.createdAt)}</dd>
        </div>
      </dl>
    </SectionCard>
  )
}
