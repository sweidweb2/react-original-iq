import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { AsyncState, EmptyState, InlineSpinner } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import {
  createRevision,
  listRevisionsForTask,
  revisionStatusLabel,
  type RevisionSession,
} from '@/services/revisions'
import { toastApiError } from '@/services/toast'
import {
  activateTask,
  addTaskFile,
  addTaskSolution,
  approveTask,
  assignTutor,
  cancelTask,
  cancelTaskSubmit,
  deleteTaskFile,
  deleteTaskSolution,
  disapproveTask,
  getTask,
  removeTutor,
  setTaskAllowView,
  submitTask,
  type TaskDetail,
  taskStatusLabel,
  updateTaskPrice,
} from '@/services/tasks'
import { listUsers, type ManagedUser } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { PortalPageShell, SectionCard } from '../PortalPageShell'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function TaskDetailsPage() {
  const { taskId = '' } = useParams()
  const { pathname } = useLocation()
  const role = useAuthStore((s) => s.user?.role)
  const userId = useAuthStore((s) => s.user?.id)

  const tasksBase = pathname.replace(/\/[^/]+\/?$/, '')
  const isStaff = role === 'admin' || role === 'coordinator' || role === 'super'
  const isAdmin = role === 'admin' || role === 'super'
  const isTutor = role === 'tutor'
  const isClient = role === 'client'
  const canViewPayments = isStaff || isClient
  const canManageRevisions = isStaff

  const [task, setTask] = useState<TaskDetail | null>(null)
  const [revisions, setRevisions] = useState<RevisionSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [priceOpen, setPriceOpen] = useState(false)
  const [priceValue, setPriceValue] = useState('')
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [revisionTitle, setRevisionTitle] = useState('')
  const [revisionDescription, setRevisionDescription] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [tutors, setTutors] = useState<ManagedUser[]>([])
  const [selectedTutorId, setSelectedTutorId] = useState('')
  const [fileLocation, setFileLocation] = useState('')
  const [fileNote, setFileNote] = useState('')
  const [solutionLocation, setSolutionLocation] = useState('')
  const [isActing, setIsActing] = useState(false)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!taskId) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [detail, revisionList] = await Promise.all([
          getTask(taskId),
          listRevisionsForTask(taskId).catch(() => ({ data: [] as RevisionSession[] })),
        ])
        if (cancelled) return
        setTask(detail)
        setRevisions(revisionList.data)
        setPriceValue(String(detail.price))
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [taskId, reloadKey])

  useEffect(() => {
    if (!assignOpen || !isStaff) return
    let cancelled = false
    void listUsers({ page: 1, limit: 100, role: 'tutor', status: 'ACTIVE' }).then((result) => {
      if (!cancelled) setTutors(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [assignOpen, isStaff])

  async function runAction(label: string, action: () => Promise<unknown>) {
    setIsActing(true)
    try {
      await action()
      toast.success(label)
      reload()
    } catch (err) {
      toastApiError(err, 'Action failed')
    } finally {
      setIsActing(false)
    }
  }

  async function onSavePrice(event: FormEvent) {
    event.preventDefault()
    if (!task) return
    const price = Number(priceValue)
    if (Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price')
      return
    }
    await runAction('Price updated', () => updateTaskPrice(task.id, price))
    setPriceOpen(false)
  }

  async function onCreateRevision(event: FormEvent) {
    event.preventDefault()
    if (!task) return
    await runAction('Revision created', () =>
      createRevision(task.id, {
        title: revisionTitle.trim() || undefined,
        description: revisionDescription.trim() || undefined,
      }),
    )
    setRevisionOpen(false)
    setRevisionTitle('')
    setRevisionDescription('')
  }

  async function onAssignTutor(event: FormEvent) {
    event.preventDefault()
    if (!task || !selectedTutorId) return
    await runAction('Tutor assigned', () => assignTutor(task.id, selectedTutorId))
    setAssignOpen(false)
  }

  const assignedTutor = task?.tutorId === userId
  const canSubmit = isTutor && assignedTutor && task?.status === 'in-progress'
  const canCancelSubmit =
    isTutor && assignedTutor && task?.status === 'waiting_coordinator_approval'
  const canApprove = isStaff && task?.status === 'waiting_coordinator_approval'

  if (!taskId) {
    return (
      <PortalPageShell title="Task details" description="Missing task id.">
        <EmptyState title="Invalid link" description="Open a task from the tasks list." />
      </PortalPageShell>
    )
  }

  if (isLoading) {
    return (
      <PortalPageShell title="Task details" description="Loading task…">
        <InlineSpinner label="Loading task…" />
      </PortalPageShell>
    )
  }

  if (error || !task) {
    return (
      <PortalPageShell title="Task details" description="Could not load this task.">
        <AsyncState error={error ?? new Error('Task not found')} onRetry={reload}>
          <span className="sr-only">Task unavailable</span>
        </AsyncState>
      </PortalPageShell>
    )
  }

  return (
    <PortalPageShell
      title={task.topic ?? 'Task details'}
      description={`${task.type ?? 'Task'} · ${task.category ?? 'General'}`}
      actions={
        <div className="flex flex-wrap gap-2">
          {isStaff ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setPriceOpen(true)}>
                Edit price
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setRevisionOpen(true)}>
                Create revision
              </Button>
              {!task.tutorId ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                  Assign tutor
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActing}
                  onClick={() => runAction('Tutor removed', () => removeTutor(task.id))}
                >
                  Remove tutor
                </Button>
              )}
              {canApprove ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isActing}
                    onClick={() => runAction('Task approved', () => approveTask(task.id))}
                  >
                    Approve delivery
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isActing}
                    onClick={() => runAction('Returned to tutor', () => disapproveTask(task.id))}
                  >
                    Disapprove
                  </Button>
                </>
              ) : null}
              {task.status !== 'cancelled' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActing}
                  onClick={() => runAction('Task cancelled', () => cancelTask(task.id))}
                >
                  Cancel task
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={isActing}
                  onClick={() => runAction('Task activated', () => activateTask(task.id))}
                >
                  Activate
                </Button>
              )}
            </>
          ) : null}
          {canSubmit ? (
            <Button
              type="button"
              size="sm"
              disabled={isActing}
              onClick={() => runAction('Submitted for approval', () => submitTask(task.id))}
            >
              Submit for approval
            </Button>
          ) : null}
          {canCancelSubmit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isActing}
              onClick={() => runAction('Submission cancelled', () => cancelTaskSubmit(task.id))}
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
              onClick={() =>
                runAction(task.allowView ? 'Client view disabled' : 'Client view enabled', () =>
                  setTaskAllowView(task.id, !task.allowView),
                )
              }
            >
              {task.allowView ? 'Disable client view' : 'Allow client view'}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{taskStatusLabel(task.status)}</Badge>
        <Badge tone="neutral">{task.paymentStatus}</Badge>
        <span className="text-sm text-muted-foreground">Deadline {formatDate(task.deadline)}</span>
        <span className="text-sm font-medium tabular-nums">${task.price.toFixed(2)}</span>
      </div>

      <SectionCard title="Task information" description="Description and metadata.">
        <p className="whitespace-pre-wrap text-sm text-foreground">{task.description ?? '—'}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Client</dt>
            <dd className="font-mono text-xs">{task.clientId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tutor</dt>
            <dd className="font-mono text-xs">{task.tutorId ?? 'Unassigned'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Coordinator</dt>
            <dd className="font-mono text-xs">{task.coordinatorId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatDate(task.createdAt)}</dd>
          </div>
        </dl>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Documents" description="Task files (URL or storage path).">
          {isStaff || (isClient && task.clientId === userId) ? (
            <form
              className="mb-4 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!fileLocation.trim()) return
                void runAction('File added', async () => {
                  await addTaskFile(task.id, fileLocation.trim(), fileNote.trim() || undefined)
                  setFileLocation('')
                  setFileNote('')
                })
              }}
            >
              <Input
                placeholder="File location URL"
                value={fileLocation}
                onChange={(e) => setFileLocation(e.target.value)}
              />
              <Input
                placeholder="Note (optional)"
                value={fileNote}
                onChange={(e) => setFileNote(e.target.value)}
              />
              <Button type="submit" size="sm" variant="outline" disabled={isActing}>
                Upload file
              </Button>
            </form>
          ) : null}
          {task.files.length === 0 ? (
            <EmptyState title="No documents" description="Upload files using a storage URL." />
          ) : (
            <ul className="space-y-2 text-sm">
              {task.files.map((file) => (
                <li key={file.id} className="flex items-start justify-between gap-2 rounded-md border p-2">
                  <div>
                    <a href={file.fileLocation} className="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
                      {file.fileLocation}
                    </a>
                    {file.note ? <p className="text-xs text-muted-foreground">{file.note}</p> : null}
                  </div>
                  {(isStaff || (isClient && task.clientId === userId)) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isActing}
                      onClick={() => runAction('File removed', () => deleteTaskFile(task.id, file.id))}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Solutions" description="Submitted work.">
          {(isStaff || (isTutor && assignedTutor)) && (
            <form
              className="mb-4 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!solutionLocation.trim()) return
                void runAction('Solution added', async () => {
                  await addTaskSolution(task.id, solutionLocation.trim())
                  setSolutionLocation('')
                })
              }}
            >
              <Input
                placeholder="Solution file location"
                value={solutionLocation}
                onChange={(e) => setSolutionLocation(e.target.value)}
              />
              <Button type="submit" size="sm" variant="outline" disabled={isActing}>
                Add solution
              </Button>
            </form>
          )}
          {task.solutions.length === 0 ? (
            <EmptyState title="No solutions" description="Tutors and staff can attach solution files." />
          ) : (
            <ul className="space-y-2 text-sm">
              {task.solutions.map((solution) => (
                <li key={solution.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <a href={solution.fileLocation} className="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
                    {solution.fileLocation}
                  </a>
                  {(isStaff || (isTutor && assignedTutor)) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isActing}
                      onClick={() =>
                        runAction('Solution removed', () => deleteTaskSolution(task.id, solution.id))
                      }
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Revision"
        description="Revision sessions for this task."
        actions={
          canManageRevisions && revisions[0] ? (
            <Link
              to={`${tasksBase}/${taskId}/revisions/${revisions[0].id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Latest revision
            </Link>
          ) : undefined
        }
      >
        {revisions.length === 0 ? (
          <EmptyState title="No revisions" description="Coordinators can open a revision session." />
        ) : (
          <ul className="space-y-2 text-sm">
            {revisions.map((revision) => (
              <li key={revision.id} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="font-medium">{revision.title ?? 'Revision session'}</p>
                  <p className="text-xs text-muted-foreground">
                    {revisionStatusLabel(revision.status)} · {formatDate(revision.createdAt)}
                  </p>
                </div>
                <Link
                  to={`${tasksBase}/${taskId}/revisions/${revision.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Payments"
        description="Payment history and balance."
        actions={
          canViewPayments ? (
            <Link
              to={`${tasksBase}/${taskId}/payments`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View payments
            </Link>
          ) : undefined
        }
      >
        <p className="text-sm text-muted-foreground">
          Payment status: <span className="font-medium text-foreground">{task.paymentStatus}</span> · Price $
          {task.price.toFixed(2)}
        </p>
      </SectionCard>

      <Dialog
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        title="Edit price"
        description="Set or update the task price."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setPriceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-price-form" size="sm" disabled={isActing}>
              Save
            </Button>
          </>
        }
      >
        <form id="edit-price-form" onSubmit={onSavePrice}>
          <Field>
            <FieldLabel htmlFor="task-price">Price (USD)</FieldLabel>
            <Input
              id="task-price"
              type="number"
              min={0}
              step="0.01"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        title="Create revision"
        description="Open a revision session for this task."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setRevisionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-revision-form" size="sm" disabled={isActing}>
              Create
            </Button>
          </>
        }
      >
        <form id="create-revision-form" onSubmit={onCreateRevision} className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="revision-title">Title</FieldLabel>
            <Input
              id="revision-title"
              value={revisionTitle}
              onChange={(e) => setRevisionTitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="revision-desc">Description</FieldLabel>
            <Textarea
              id="revision-desc"
              rows={3}
              value={revisionDescription}
              onChange={(e) => setRevisionDescription(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign tutor"
        description="Pick an active tutor for this task."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="assign-tutor-form" size="sm" disabled={isActing || !selectedTutorId}>
              Assign
            </Button>
          </>
        }
      >
        <form id="assign-tutor-form" onSubmit={onAssignTutor}>
          <Field>
            <FieldLabel htmlFor="tutor-select">Tutor</FieldLabel>
            <Select
              id="tutor-select"
              value={selectedTutorId}
              onChange={(e) => setSelectedTutorId(e.target.value)}
            >
              <option value="">Select tutor…</option>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.profile?.displayName ?? tutor.email}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Dialog>
    </PortalPageShell>
  )
}
