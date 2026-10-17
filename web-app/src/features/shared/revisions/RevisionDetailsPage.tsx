import { type FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { AsyncState, EmptyState, InlineSpinner } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePortalBreadcrumbs } from '@/features/portals/usePortalBreadcrumbs'
import { useCan } from '@/lib/permissions'
import {
  approveRevision,
  cancelRevision,
  cancelRevisionSubmit,
  getRevision,
  rejectRevision,
  type RevisionDetail,
  revisionStatusLabel,
  submitRevision,
  updateRevision,
} from '@/services/revisions'
import { toastApiError, toastSuccess } from '@/services/toast'

import { PortalPageShell, SectionCard } from '../PortalPageShell'
import { revisionStatusTone } from '../tasks/taskDetailsFormat'
import { useTaskTopic } from '../tasks/useTaskTopic'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  )
}

export function RevisionDetailsPage() {
  const { taskId = '', revisionId = '' } = useParams()
  const can = useCan()
  const canManage = can('manage_revisions')
  const canSubmitRevisions = can('submit_revisions')

  const [revision, setRevision] = useState<RevisionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isActing, setIsActing] = useState(false)

  const taskTopic = useTaskTopic(taskId)
  const breadcrumbs = usePortalBreadcrumbs([
    { label: 'Tasks', path: 'tasks' },
    ...(taskId ? [{ label: taskTopic ?? 'Task', path: `tasks/${taskId}?tab=revision` }] : []),
    { label: revision?.title ?? 'Revision details' },
  ])

  useEffect(() => {
    if (!revisionId) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getRevision(revisionId)
        if (!cancelled) {
          setRevision(data)
          setTitle(data.title ?? '')
          setDescription(data.description ?? '')
        }
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
  }, [revisionId, reloadKey])

  async function runAction(
    copy: { success: string; failure: string; detail?: string },
    action: () => Promise<unknown>,
  ): Promise<boolean> {
    setIsActing(true)
    try {
      const result = await action()
      if (result && typeof result === 'object' && 'status' in result) {
        setRevision((prev) => (prev ? { ...prev, ...(result as RevisionDetail) } : prev))
      }
      toastSuccess(copy.success, copy.detail)
      setReloadKey((k) => k + 1)
      return true
    } catch (err) {
      toastApiError(err, copy.failure)
      return false
    } finally {
      setIsActing(false)
    }
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault()
    if (!revisionId) return
    const ok = await runAction(
      { success: 'Revision details saved', failure: "Couldn't save the revision details" },
      () =>
        updateRevision(revisionId, {
          title,
          description,
        }),
    )
    if (ok) setEditOpen(false)
  }

  if (!revisionId) {
    return (
      <PortalPageShell
        title="Revision details"
        description="Missing revision id."
        breadcrumbs={breadcrumbs}
      >
        <EmptyState title="Invalid link" description="Open a revision from the task page." />
      </PortalPageShell>
    )
  }

  if (isLoading) {
    return (
      <PortalPageShell title="Revision details" description="Loading…" breadcrumbs={breadcrumbs}>
        <InlineSpinner label="Loading revision…" />
      </PortalPageShell>
    )
  }

  if (error || !revision) {
    return (
      <PortalPageShell
        title="Revision details"
        description="Could not load revision."
        breadcrumbs={breadcrumbs}
      >
        <AsyncState
          error={error ?? new Error('Not found')}
          onRetry={() => setReloadKey((k) => k + 1)}
        >
          <span className="sr-only">Revision unavailable</span>
        </AsyncState>
      </PortalPageShell>
    )
  }

  const canApprove = canManage && revision.status === 'waiting_coordinator_approval'
  const canSubmit = canSubmitRevisions && revision.status === 'in-revision'
  const canCancelSubmit = canSubmitRevisions && revision.status === 'waiting_coordinator_approval'

  return (
    <PortalPageShell
      title={revision.title ?? 'Revision session'}
      description="Revision session details and linked solutions."
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                Edit revision
              </Button>
              {revision.status !== 'cancelled' && revision.status !== 'completed' ? (
                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  disabled={isActing}
                  onClick={() =>
                    runAction(
                      {
                        success: 'Revision session cancelled',
                        failure: "Couldn't cancel the revision session",
                      },
                      () => cancelRevision(revision.id),
                    )
                  }
                >
                  Cancel session
                </Button>
              ) : null}
            </>
          ) : null}
          {canApprove ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={isActing}
                onClick={() =>
                  runAction(
                    {
                      success: 'Revision approved',
                      failure: "Couldn't approve the revision",
                      detail: 'The revision session is now completed.',
                    },
                    () => approveRevision(revision.id),
                  )
                }
              >
                Approve
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isActing}
                onClick={() =>
                  runAction(
                    {
                      success: 'Revision sent back',
                      failure: "Couldn't send the revision back",
                      detail: 'The tutor can rework and resubmit it.',
                    },
                    () => rejectRevision(revision.id),
                  )
                }
              >
                Reject
              </Button>
            </>
          ) : null}
          {canSubmit ? (
            <Button
              type="button"
              size="sm"
              disabled={isActing}
              onClick={() =>
                runAction(
                  {
                    success: 'Revision submitted',
                    failure: "Couldn't submit the revision",
                    detail: 'The coordinator will review it.',
                  },
                  () => submitRevision(revision.id),
                )
              }
            >
              Submit revision
            </Button>
          ) : null}
          {canCancelSubmit ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isActing}
              onClick={() =>
                runAction(
                  { success: 'Submission withdrawn', failure: "Couldn't withdraw the submission" },
                  () => cancelRevisionSubmit(revision.id),
                )
              }
            >
              Cancel submission
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={revisionStatusTone(revision.status)}>
          {revisionStatusLabel(revision.status)}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Started {formatDate(revision.startDate)}
        </span>
      </div>

      <SectionCard title="Session" description="Revision window, status, and notes.">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Deadline</dt>
            <dd>{formatDate(revision.deadline)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Submitted</dt>
            <dd>{formatDate(revision.submitDate)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Description</dt>
            <dd className="whitespace-pre-wrap">{revision.description ?? '—'}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Revision solutions" description="Linked solution files for this session.">
        {revision.solutions.length === 0 ? (
          <EmptyState
            title="No revision solutions"
            description="Tutors can link solutions when submitting."
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {revision.solutions.map((row, index) => (
              <li key={row.id} className="rounded-md border p-2">
                Solution {index + 1} · {formatDate(row.date)}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit revision"
        description="Update revision session details."
        footer={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-revision-form" size="sm" disabled={isActing}>
              Save
            </Button>
          </>
        }
      >
        <form id="edit-revision-form" onSubmit={onSaveEdit} className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="rev-title">Title</FieldLabel>
            <Input id="rev-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="rev-desc">Description</FieldLabel>
            <Textarea
              id="rev-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>
    </PortalPageShell>
  )
}
