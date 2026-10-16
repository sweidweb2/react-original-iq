import { Button } from '@/components/ui/button'
import type { TaskDetail } from '@/services/tasks'

export function TaskDetailsActions({
  task,
  isActing,
  isStaff,
  isAdmin,
  canEditFields,
  canDelete,
  canApprove,
  canSubmit,
  canCancelSubmit,
  onEdit,
  onDelete,
  onCoord,
  onPrice,
  onRevision,
  onAssign,
  onRemoveTutor,
  onApprove,
  onDisapprove,
  onCancel,
  onActivate,
  onSubmit,
  onCancelSubmit,
  onToggleAllowView,
}: {
  task: TaskDetail
  isActing: boolean
  isStaff: boolean
  isAdmin: boolean
  canEditFields: boolean
  canDelete: boolean
  canApprove: boolean
  canSubmit: boolean
  canCancelSubmit: boolean
  onEdit: () => void
  onDelete: () => void
  onCoord: () => void
  onPrice: () => void
  onRevision: () => void
  onAssign: () => void
  onRemoveTutor: () => void
  onApprove: () => void
  onDisapprove: () => void
  onCancel: () => void
  onActivate: () => void
  onSubmit: () => void
  onCancelSubmit: () => void
  onToggleAllowView: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canEditFields ? (
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Edit details
        </Button>
      ) : null}
      {canDelete ? (
        <Button type="button" variant="outline" size="sm" disabled={isActing} onClick={onDelete}>
          Delete
        </Button>
      ) : null}
      {isAdmin ? (
        <Button type="button" variant="outline" size="sm" onClick={onCoord}>
          Change coordinator
        </Button>
      ) : null}
      {isStaff ? (
        <>
          <Button type="button" variant="outline" size="sm" onClick={onPrice}>
            Edit price
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onRevision}>
            Create revision
          </Button>
          {!task.tutorId ? (
            <Button type="button" variant="outline" size="sm" onClick={onAssign}>
              Assign tutor
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isActing}
              onClick={onRemoveTutor}
            >
              Remove tutor
            </Button>
          )}
          {canApprove ? (
            <>
              <Button type="button" size="sm" disabled={isActing} onClick={onApprove}>
                Approve delivery
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isActing}
                onClick={onDisapprove}
              >
                Disapprove
              </Button>
            </>
          ) : null}
          {task.status !== 'cancelled' ? (
            <Button type="button" variant="outline" size="sm" disabled={isActing} onClick={onCancel}>
              Cancel task
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={isActing} onClick={onActivate}>
              Activate
            </Button>
          )}
        </>
      ) : null}
      {canSubmit ? (
        <Button type="button" size="sm" disabled={isActing} onClick={onSubmit}>
          Submit for approval
        </Button>
      ) : null}
      {canCancelSubmit ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isActing}
          onClick={onCancelSubmit}
        >
          Cancel submission
        </Button>
      ) : null}
      {isAdmin ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isActing}
          onClick={onToggleAllowView}
        >
          {task.allowView ? 'Disable client view' : 'Allow client view'}
        </Button>
      ) : null}
    </div>
  )
}
