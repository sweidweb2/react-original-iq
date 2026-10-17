import { useSearchParams } from 'react-router-dom'

import { AsyncState, EmptyState, InlineSpinner } from '@/components/feedback'
import { Badge } from '@/components/ui/badge'
import { type TabItem, TabPanel, Tabs } from '@/components/ui/tabs'
import { usePortalBreadcrumbs } from '@/features/portals/usePortalBreadcrumbs'
import { taskStatusLabel } from '@/services/tasks'

import { PortalPageShell } from '../PortalPageShell'
import { TaskCoordinatorSection, TaskTutorSection } from './TaskAssignmentSection'
import { TaskControlsSection } from './TaskControlsSection'
import { TaskDetailsActions } from './TaskDetailsActions'
import { TaskDetailsDialogs } from './TaskDetailsDialogs'
import {
  formatTaskDate,
  paymentStatusLabel,
  paymentStatusTone,
  taskStatusTone,
} from './taskDetailsFormat'
import { TaskDocumentsSection } from './TaskDocumentsSection'
import { TaskInfoSection } from './TaskInfoSection'
import { TaskPaymentsSection } from './TaskPaymentsSection'
import { TaskRevisionSection } from './TaskRevisionSection'
import { TaskSolutionsSection } from './TaskSolutionsSection'
import { useTaskDetails } from './useTaskDetails'

const TABS = ['details', 'documents', 'payments', 'revision'] as const
type TaskTab = (typeof TABS)[number]
const TABS_ID = 'task-details'

function isTaskTab(value: string | null): value is TaskTab {
  return TABS.includes(value as TaskTab)
}

export function TaskDetailsPage() {
  const model = useTaskDetails()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: TaskTab = isTaskTab(tabParam) ? tabParam : 'details'
  const breadcrumbs = usePortalBreadcrumbs([
    { label: 'Tasks', path: 'tasks' },
    { label: model.task?.topic ?? 'Task details' },
  ])

  function onTabChange(tab: TaskTab) {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params)
        if (tab === 'details') next.delete('tab')
        else next.set('tab', tab)
        return next
      },
      { replace: true },
    )
  }

  if (!model.taskId) {
    return (
      <PortalPageShell
        title="Task details"
        description="Missing task id."
        breadcrumbs={breadcrumbs}
      >
        <EmptyState title="Invalid link" description="Open a task from the tasks list." />
      </PortalPageShell>
    )
  }

  if (model.isLoading) {
    return (
      <PortalPageShell title="Task details" description="Loading task…" breadcrumbs={breadcrumbs}>
        <InlineSpinner label="Loading task…" />
      </PortalPageShell>
    )
  }

  if (model.error || !model.task) {
    return (
      <PortalPageShell
        title="Task details"
        description="Could not load this task."
        breadcrumbs={breadcrumbs}
      >
        <AsyncState error={model.error ?? new Error('Task not found')} onRetry={model.reload}>
          <span className="sr-only">Task unavailable</span>
        </AsyncState>
      </PortalPageShell>
    )
  }

  const { task } = model
  const canUploadDocs = model.isStaff || (model.isClient && task.clientId === model.userId)
  const canManageSolutions = model.isStaff || (model.isTutor && model.assignedTutor)
  const tabs: TabItem<TaskTab>[] = [
    { id: 'details', label: 'Details' },
    { id: 'documents', label: 'Documents', count: task.files.length + task.solutions.length },
    { id: 'payments', label: 'Payments' },
    { id: 'revision', label: 'Revision', count: model.revisions.length },
  ]

  return (
    <PortalPageShell
      title={task.topic ?? 'Task details'}
      description={`${task.type ?? 'Task'} · ${task.category ?? 'General'}`}
      breadcrumbs={breadcrumbs}
      actions={
        <TaskDetailsActions
          isActing={model.isActing}
          canApprove={model.canApprove}
          canSubmit={model.canSubmit}
          canCancelSubmit={model.canCancelSubmit}
          onApprove={() => model.runAction('Task approved', () => model.approveTask(task.id))}
          onDisapprove={() =>
            model.runAction('Returned to tutor', () => model.disapproveTask(task.id))
          }
          onSubmit={() =>
            model.runAction('Submitted for approval', () => model.submitTask(task.id))
          }
          onCancelSubmit={() =>
            model.runAction('Submission cancelled', () => model.cancelTaskSubmit(task.id))
          }
        />
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
        <Badge tone={paymentStatusTone(task.paymentStatus)}>
          {paymentStatusLabel(task.paymentStatus)}
        </Badge>
        <span className="text-muted-foreground">
          Deadline{' '}
          <span className="font-medium text-foreground">{formatTaskDate(task.deadline)}</span>
        </span>
        <span className="text-muted-foreground">
          Price{' '}
          <span className="font-medium text-foreground tabular-nums">${task.price.toFixed(2)}</span>
        </span>
      </div>

      <Tabs
        items={tabs}
        value={activeTab}
        onChange={onTabChange}
        label="Task sections"
        idPrefix={TABS_ID}
      />

      {activeTab === 'details' ? (
        <TabPanel idPrefix={TABS_ID} id="details">
          <div className="flex flex-col gap-6">
            <TaskInfoSection
              task={task}
              canEdit={model.canEditFields}
              canDelete={model.canDelete}
              isActing={model.isActing}
              onEdit={() => model.setEditOpen(true)}
              onDelete={() => void model.onDeleteTask()}
            />
            {model.isStaff ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <TaskTutorSection
                  task={task}
                  tutors={model.tutors}
                  isLoading={model.tutorsLoading}
                  isActing={model.isActing}
                  selectedTutorId={model.selectedTutorId}
                  onSelectedTutorIdChange={model.setSelectedTutorId}
                  onAssignTutor={(event) => void model.onAssignTutor(event)}
                  onRemoveTutor={() =>
                    void model.runAction('Tutor removed', () => model.removeTutor(task.id))
                  }
                />
                {model.isAdmin ? (
                  <TaskCoordinatorSection
                    task={task}
                    coordinators={model.coordinators}
                    isLoading={model.coordinatorsLoading}
                    isActing={model.isActing}
                    selectedCoordId={model.selectedCoordId}
                    onSelectedCoordIdChange={model.setSelectedCoordId}
                    onChangeCoordinator={(event) => void model.onChangeCoordinator(event)}
                  />
                ) : null}
              </div>
            ) : null}
            {model.isStaff ? (
              <TaskControlsSection
                task={task}
                isAdmin={model.isAdmin}
                isActing={model.isActing}
                onCancel={() => model.runAction('Task cancelled', () => model.cancelTask(task.id))}
                onActivate={() =>
                  model.runAction('Task activated', () => model.activateTask(task.id))
                }
                onToggleAllowView={() =>
                  model.runAction(
                    task.allowView ? 'Client view disabled' : 'Client view enabled',
                    () => model.setTaskAllowView(task.id, !task.allowView),
                  )
                }
              />
            ) : null}
          </div>
        </TabPanel>
      ) : null}

      {activeTab === 'documents' ? (
        <TabPanel idPrefix={TABS_ID} id="documents">
          <div className="grid gap-6 lg:grid-cols-2">
            <TaskDocumentsSection
              task={task}
              canUpload={Boolean(canUploadDocs)}
              isActing={model.isActing}
              isUploading={model.uploadTarget === 'documents'}
              onUpload={(files) => void model.onUpload('documents', files)}
              onOpenFile={model.onOpenFile}
              onRemoveFile={(fileId) =>
                void model.runAction('File removed', () => model.deleteTaskFile(task.id, fileId))
              }
            />
            <TaskSolutionsSection
              task={task}
              canManage={Boolean(canManageSolutions)}
              isActing={model.isActing}
              isUploading={model.uploadTarget === 'solutions'}
              onUpload={(files) => void model.onUpload('solutions', files)}
              onOpenSolution={model.onOpenSolution}
              onRemoveSolution={(solutionId) =>
                void model.runAction('Solution removed', () =>
                  model.deleteTaskSolution(task.id, solutionId),
                )
              }
            />
          </div>
        </TabPanel>
      ) : null}

      {activeTab === 'payments' ? (
        <TabPanel idPrefix={TABS_ID} id="payments">
          <TaskPaymentsSection
            task={task}
            taskId={model.taskId}
            tasksBase={model.tasksBase}
            canViewPayments={model.canViewPayments}
            canEditPrice={model.isStaff}
            onEditPrice={() => model.setPriceOpen(true)}
          />
        </TabPanel>
      ) : null}

      {activeTab === 'revision' ? (
        <TabPanel idPrefix={TABS_ID} id="revision">
          <TaskRevisionSection
            taskId={model.taskId}
            tasksBase={model.tasksBase}
            revisions={model.revisions}
            canManageRevisions={model.canManageRevisions}
            onCreateRevision={() => model.setRevisionOpen(true)}
          />
        </TabPanel>
      ) : null}

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
      />
    </PortalPageShell>
  )
}
