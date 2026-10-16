import { AsyncState, EmptyState, InlineSpinner } from '@/components/feedback'
import { Badge } from '@/components/ui/badge'
import { taskStatusLabel } from '@/services/tasks'

import { PortalPageShell } from '../PortalPageShell'
import { TaskDetailsActions } from './TaskDetailsActions'
import { TaskDetailsDialogs } from './TaskDetailsDialogs'
import { TaskDocumentsSection } from './TaskDocumentsSection'
import { TaskInfoSection } from './TaskInfoSection'
import { TaskPaymentsSection } from './TaskPaymentsSection'
import { TaskRevisionSection } from './TaskRevisionSection'
import { TaskSolutionsSection } from './TaskSolutionsSection'
import { formatTaskDate } from './taskDetailsFormat'
import { useTaskDetails } from './useTaskDetails'

export function TaskDetailsPage() {
  const model = useTaskDetails()

  if (!model.taskId) {
    return (
      <PortalPageShell title="Task details" description="Missing task id.">
        <EmptyState title="Invalid link" description="Open a task from the tasks list." />
      </PortalPageShell>
    )
  }

  if (model.isLoading) {
    return (
      <PortalPageShell title="Task details" description="Loading task…">
        <InlineSpinner label="Loading task…" />
      </PortalPageShell>
    )
  }

  if (model.error || !model.task) {
    return (
      <PortalPageShell title="Task details" description="Could not load this task.">
        <AsyncState error={model.error ?? new Error('Task not found')} onRetry={model.reload}>
          <span className="sr-only">Task unavailable</span>
        </AsyncState>
      </PortalPageShell>
    )
  }

  const { task } = model
  const canUploadDocs = model.isStaff || (model.isClient && task.clientId === model.userId)
  const canManageSolutions = model.isStaff || (model.isTutor && model.assignedTutor)

  return (
    <PortalPageShell
      title={task.topic ?? 'Task details'}
      description={`${task.type ?? 'Task'} · ${task.category ?? 'General'}`}
      actions={
        <TaskDetailsActions
          task={task}
          isActing={model.isActing}
          isStaff={model.isStaff}
          isAdmin={model.isAdmin}
          canEditFields={model.canEditFields}
          canDelete={model.canDelete}
          canApprove={model.canApprove}
          canSubmit={model.canSubmit}
          canCancelSubmit={model.canCancelSubmit}
          onEdit={() => model.setEditOpen(true)}
          onDelete={() => void model.onDeleteTask()}
          onCoord={() => model.setCoordOpen(true)}
          onPrice={() => model.setPriceOpen(true)}
          onRevision={() => model.setRevisionOpen(true)}
          onAssign={() => model.setAssignOpen(true)}
          onRemoveTutor={() => model.runAction('Tutor removed', () => model.removeTutor(task.id))}
          onApprove={() => model.runAction('Task approved', () => model.approveTask(task.id))}
          onDisapprove={() =>
            model.runAction('Returned to tutor', () => model.disapproveTask(task.id))
          }
          onCancel={() => model.runAction('Task cancelled', () => model.cancelTask(task.id))}
          onActivate={() => model.runAction('Task activated', () => model.activateTask(task.id))}
          onSubmit={() =>
            model.runAction('Submitted for approval', () => model.submitTask(task.id))
          }
          onCancelSubmit={() =>
            model.runAction('Submission cancelled', () => model.cancelTaskSubmit(task.id))
          }
          onToggleAllowView={() =>
            model.runAction(
              task.allowView ? 'Client view disabled' : 'Client view enabled',
              () => model.setTaskAllowView(task.id, !task.allowView),
            )
          }
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{taskStatusLabel(task.status)}</Badge>
        <Badge tone="neutral">{task.paymentStatus}</Badge>
        <span className="text-sm text-muted-foreground">
          Deadline {formatTaskDate(task.deadline)}
        </span>
        <span className="text-sm font-medium tabular-nums">${task.price.toFixed(2)}</span>
      </div>

      <TaskInfoSection task={task} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TaskDocumentsSection
          task={task}
          canUpload={Boolean(canUploadDocs)}
          isActing={model.isActing}
          fileLocation={model.fileLocation}
          fileNote={model.fileNote}
          onFileLocationChange={model.setFileLocation}
          onFileNoteChange={model.setFileNote}
          onAddFile={(event) => void model.onAddFile(event)}
          onRemoveFile={(fileId) =>
            void model.runAction('File removed', () => model.deleteTaskFile(task.id, fileId))
          }
        />
        <TaskSolutionsSection
          task={task}
          canManage={Boolean(canManageSolutions)}
          isActing={model.isActing}
          solutionLocation={model.solutionLocation}
          onSolutionLocationChange={model.setSolutionLocation}
          onAddSolution={(event) => void model.onAddSolution(event)}
          onRemoveSolution={(solutionId) =>
            void model.runAction('Solution removed', () =>
              model.deleteTaskSolution(task.id, solutionId),
            )
          }
        />
      </div>

      <TaskRevisionSection
        taskId={model.taskId}
        tasksBase={model.tasksBase}
        revisions={model.revisions}
        canManageRevisions={model.canManageRevisions}
      />

      <TaskPaymentsSection
        task={task}
        taskId={model.taskId}
        tasksBase={model.tasksBase}
        canViewPayments={model.canViewPayments}
      />

      <TaskDetailsDialogs
        isActing={model.isActing}
        priceOpen={model.priceOpen}
        setPriceOpen={model.setPriceOpen}
        priceValue={model.priceValue}
        setPriceValue={model.setPriceValue}
        onSavePrice={(event) => void model.onSavePrice(event)}
        revisionOpen={model.revisionOpen}
        setRevisionOpen={model.setRevisionOpen}
        revisionTitle={model.revisionTitle}
        setRevisionTitle={model.setRevisionTitle}
        revisionDescription={model.revisionDescription}
        setRevisionDescription={model.setRevisionDescription}
        onCreateRevision={(event) => void model.onCreateRevision(event)}
        assignOpen={model.assignOpen}
        setAssignOpen={model.setAssignOpen}
        selectedTutorId={model.selectedTutorId}
        setSelectedTutorId={model.setSelectedTutorId}
        tutors={model.tutors}
        onAssignTutor={(event) => void model.onAssignTutor(event)}
        editOpen={model.editOpen}
        setEditOpen={model.setEditOpen}
        editTopic={model.editTopic}
        setEditTopic={model.setEditTopic}
        editType={model.editType}
        setEditType={model.setEditType}
        editCategory={model.editCategory}
        setEditCategory={model.setEditCategory}
        editDescription={model.editDescription}
        setEditDescription={model.setEditDescription}
        onSaveEdit={(event) => void model.onSaveEdit(event)}
        coordOpen={model.coordOpen}
        setCoordOpen={model.setCoordOpen}
        selectedCoordId={model.selectedCoordId}
        setSelectedCoordId={model.setSelectedCoordId}
        coordinators={model.coordinators}
        onChangeCoordinator={(event) => void model.onChangeCoordinator(event)}
      />
    </PortalPageShell>
  )
}
