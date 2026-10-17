import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'

function ClientViewSwitch({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Allow client view"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition',
        checked ? 'bg-primary' : 'bg-border',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 start-0.5 size-5 rounded-full bg-white shadow-sm transition',
          checked && 'translate-x-5 rtl:-translate-x-5',
        )}
      />
    </button>
  )
}

export function TaskControlsSection({
  task,
  canToggleAllowView,
  canCancel,
  isActing,
  onCancel,
  onActivate,
  onToggleAllowView,
}: {
  task: TaskDetail
  canToggleAllowView: boolean
  canCancel: boolean
  isActing: boolean
  onCancel: () => void
  onActivate: () => void
  onToggleAllowView: () => void
}) {
  const isCancelled = task.status === 'cancelled'
  const isCompleted = task.status === 'completed'

  return (
    <SectionCard title="Task controls" description="Visibility and lifecycle of this task.">
      <div className="divide-y divide-border">
        {canToggleAllowView ? (
          <div className="flex items-center justify-between gap-4 pb-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Client view</p>
              <p className="text-sm text-muted-foreground">
                {task.allowView
                  ? 'The client can open this task from their portal.'
                  : 'This task is hidden from the client.'}
              </p>
            </div>
            <ClientViewSwitch
              checked={task.allowView}
              disabled={isActing}
              onToggle={onToggleAllowView}
            />
          </div>
        ) : null}
        {canCancel ? (
          <div
            className={cn('flex items-center justify-between gap-4', canToggleAllowView && 'pt-4')}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {isCancelled ? 'Reactivate task' : 'Cancel task'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isCancelled
                  ? 'Bring this task back into the active workflow.'
                  : isCompleted
                    ? 'Completed tasks cannot be cancelled.'
                    : 'Stop all work on this task. You can reactivate it later.'}
              </p>
            </div>
            {isCompleted ? null : isCancelled ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isActing}
                onClick={onActivate}
              >
                Activate
              </Button>
            ) : (
              <Button
                type="button"
                variant="danger-soft"
                size="sm"
                disabled={isActing}
                onClick={onCancel}
              >
                Cancel task
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}
