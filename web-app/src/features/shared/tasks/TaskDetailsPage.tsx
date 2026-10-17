import { Pencil } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { AsyncState, EmptyState, InlineSpinner } from '@/components/feedback'
import { Badge } from '@/components/ui/badge'
import { IconAction } from '@/components/ui/icon-action'
import { type TabItem, TabPanel, Tabs } from '@/components/ui/tabs'
import { usePortalBreadcrumbs } from '@/features/portals/usePortalBreadcrumbs'
import { taskStatusLabel } from '@/services/tasks'

import { PortalPageShell } from '../PortalPageShell'
import { TaskCoordinatorSection, TaskTutorSection } from './TaskAssignmentSection'
import { TaskControlsSection } from './TaskControlsSection'
import { TaskCurrencyConverter } from './TaskCurrencyConverter'
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
  const showControls = model.canCancelTasks || model.canToggleAllowView
  const tabs: TabItem<TaskTab>[] = [
    { id: 'details', label: 'Details' },
    { id: 'documents', label: 'Documents', count: task.files.length + task.solutions.length },
    ...(model.canViewPaymentSummary ? [{ id: 'payments' as const, label: 'Payments' }] : []),
    ...(model.canViewRevisions
      ? [{ id: 'revision' as const, label: 'Revision', count: model.revisions.length }]
      : []),
  ]
  const visibleTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : 'details'

  return (
    <PortalPageShell
      title={task.topic ?? 'Task details'}
      hideTitle
      breadcrumbs={breadcrumbs}
      actions={
        model.canApprove || model.canSubmit || model.canCancelSubmit ? (
          <TaskDetailsActions
            isActing={model.isActing}
            canApprove={model.canApprove}
            canSubmit={model.canSubmit}
            canCancelSubmit={model.canCancelSubmit}
            onApprove={() =>
              model.runTaskAction(
                { success: 'Task approved', failure: "Couldn't approve the task" },
                () => model.approveTask(task.id),
              )
            }
            onDisapprove={() =>
              model.runTaskAction(
                {
                  success: 'Returned to tutor',
                  failure: "Couldn't return the task to the tutor",
                  detail: 'The tutor can now rework the submission.',
                },
                () => model.disapproveTask(task.id),
              )
            }
            onSubmit={() =>
              model.runTaskAction(
                {
                  success: 'Submitted for approval',
                  failure: "Couldn't submit the task",
                  detail: 'The coordinator will review your work.',
                },
                () => model.submitTask(task.id),
              )
            }
            onCancelSubmit={() =>
              model.runTaskAction(
                { success: 'Submission withdrawn', failure: "Couldn't withdraw the submission" },
                () => model.cancelTaskSubmit(task.id),
              )
            }
          />
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
        {model.canViewPaymentSummary ? (
          <Badge tone={paymentStatusTone(task.paymentStatus)}>
            {paymentStatusLabel(task.paymentStatus)}
          </Badge>
        ) : null}
        <span className="text-muted-foreground">
          Deadline{' '}
          <span className="font-medium text-foreground">{formatTaskDate(task.deadline)}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          Price{' '}
          <span className="font-medium text-foreground tabular-nums">${task.price.toFixed(2)}</span>
          {model.canSetPrice ? (
            <IconAction label="Edit price" onClick={() => model.setPriceOpen(true)}>
              <Pencil className="size-4" aria-hidden />
            </IconAction>
          ) : null}
        </span>
      </div>

      <Tabs
        items={tabs}
        value={visibleTab}
        onChange={onTabChange}
        label="Task sections"
        idPrefix={TABS_ID}
      />

      {visibleTab === 'details' ? (
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
            {model.canAssignTutors || model.canChangeCoordinator ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {model.canAssignTutors ? (
                  <TaskTutorSection
                    task={task}
                    tutors={model.tutors}
                    isLoading={model.tutorsLoading}
                    isActing={model.isActing}
                    selectedTutorId={model.selectedTutorId}
                    onSelectedTutorIdChange={model.setSelectedTutorId}
                    onAssignTutor={(event) => void model.onAssignTutor(event)}
                    onRemoveTutor={() =>
                      void model.runTaskAction(
                        { success: 'Tutor removed', failure: "Couldn't remove the tutor" },
                        () => model.removeTutor(task.id),
                      )
                    }
                  />
                ) : null}
                {model.canChangeCoordinator ? (
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
            {showControls ? (
              <TaskControlsSection
                task={task}
                canToggleAllowView={model.canToggleAllowView}
                canCancel={model.canCancelTasks}
                isActing={model.isActing}
                onCancel={() =>
                  model.runTaskAction(
                    { success: 'Task cancelled', failure: "Couldn't cancel the task" },
                    () => model.cancelTask(task.id),
                  )
                }
                onActivate={() =>
                  model.runTaskAction(
                    { success: 'Task reactivated', failure: "Couldn't reactivate the task" },
                    () => model.activateTask(task.id),
                  )
                }
                onToggleAllowView={() =>
                  model.runTaskAction(
                    task.allowView
                      ? {
                          success: 'Client view turned off',
                          failure: "Couldn't hide the task from the client",
                          detail: 'The client can no longer see this task.',
                        }
                      : {
                          success: 'Client view turned on',
                          failure: "Couldn't share the task with the client",
                          detail: 'The client can now see this task.',
                        },
                    () => model.setTaskAllowView(task.id, !task.allowView),
                  )
                }
              />
            ) : null}
          </div>
        </TabPanel>
      ) : null}

      {visibleTab === 'documents' ? (
        <TabPanel idPrefix={TABS_ID} id="documents">
          <div className="grid gap-6 lg:grid-cols-2">
            <TaskDocumentsSection
              task={task}
              canUpload={model.canUploadDocs}
              canRemove={model.canRemoveDocs}
              canZip={model.canZip}
              isActing={model.isActing}
              uploadProgress={model.uploadTarget === 'documents' ? model.uploadProgress : null}
              isZipping={model.zipping === 'documents'}
              onUpload={(files) => void model.onUpload('documents', files)}
              onOpenFile={model.onOpenFile}
              onRemoveFile={model.onRemoveFile}
              onDownloadZip={(ids) => model.downloadZip('documents', ids)}
            />
            <TaskSolutionsSection
              task={task}
              canUpload={model.canUploadSolutions}
              canRemove={model.canRemoveSolutions}
              canZip={model.canZip}
              isActing={model.isActing}
              uploadProgress={model.uploadTarget === 'solutions' ? model.uploadProgress : null}
              isZipping={model.zipping === 'solutions'}
              onUpload={(files) => void model.onUpload('solutions', files)}
              onOpenSolution={model.onOpenSolution}
              onRemoveSolution={model.onRemoveSolution}
              onDownloadZip={(ids) => model.downloadZip('solutions', ids)}
            />
          </div>
        </TabPanel>
      ) : null}

      {visibleTab === 'payments' ? (
        <TabPanel idPrefix={TABS_ID} id="payments">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <TaskPaymentsSection
              task={task}
              taskId={model.taskId}
              tasksBase={model.tasksBase}
              canViewPayments={model.canViewPayments}
            />
            <aside aria-label="Currency conversion">
              <TaskCurrencyConverter amountUsd={task.price} />
            </aside>
          </div>
        </TabPanel>
      ) : null}

      {visibleTab === 'revision' ? (
        <TabPanel idPrefix={TABS_ID} id="revision">
          <TaskRevisionSection
            taskId={model.taskId}
            tasksBase={model.tasksBase}
            revisions={model.revisions}
            canCreateRevisions={model.canCreateRevisions}
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
