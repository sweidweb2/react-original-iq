import { Button } from '@/components/ui/button'

export function TaskDetailsActions({
  isActing,
  canApprove,
  canSubmit,
  canCancelSubmit,
  onApprove,
  onDisapprove,
  onSubmit,
  onCancelSubmit,
}: {
  isActing: boolean
  canApprove: boolean
  canSubmit: boolean
  canCancelSubmit: boolean
  onApprove: () => void
  onDisapprove: () => void
  onSubmit: () => void
  onCancelSubmit: () => void
}) {
  if (!canApprove && !canSubmit && !canCancelSubmit) return null

  return (
    <div className="flex flex-wrap gap-2">
      {canApprove ? (
        <>
          <Button type="button" size="sm" disabled={isActing} onClick={onApprove}>
            Approve delivery
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isActing}
            onClick={onDisapprove}
          >
            Disapprove
          </Button>
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
          variant="secondary"
          size="sm"
          disabled={isActing}
          onClick={onCancelSubmit}
        >
          Cancel submission
        </Button>
      ) : null}
    </div>
  )
}
