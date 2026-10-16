import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AsyncState, EmptyState, InlineSpinner } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import {
  approveRevision,
  cancelRevision,
  cancelRevisionSubmit,
  getRevision,
  rejectRevision,
  revisionStatusLabel,
  submitRevision,
  updateRevision,
  type RevisionDetail,
} from '@/services/revisions'
import { toastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { PortalPageShell, SectionCard } from '../PortalPageShell'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function RevisionDetailsPage() {
  const { taskId = '', revisionId = '' } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const isStaff = role === 'admin' || role === 'coordinator' || role === 'super'
  const isTutor = role === 'tutor'

  const [revision, setRevision] = useState<RevisionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isActing, setIsActing] = useState(false)

  const taskPath = '..'

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

  async function runAction(label: string, action: () => Promise<unknown>) {
    setIsActing(true)
    try {
      const result = await action()
      if (result && typeof result === 'object' && 'status' in result) {
        setRevision((prev) => (prev ? { ...prev, ...(result as RevisionDetail) } : prev))
      }
      toast.success(label)
      setReloadKey((k) => k + 1)
    } catch (err) {
      toastApiError(err, 'Action failed')
    } finally {
      setIsActing(false)
    }
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault()
    if (!revisionId) return
    await runAction('Revision updated', () =>
      updateRevision(revisionId, {
        title,
        description,
      }),
    )
    setEditOpen(false)
  }

  if (!revisionId) {
    return (
      <PortalPageShell title="Revision details" description="Missing revision id.">
        <EmptyState title="Invalid link" description="Open a revision from the task page." />
      </PortalPageShell>
    )
  }

  if (isLoading) {
    return (
      <PortalPageShell title="Revision details" description="Loading…">
        <InlineSpinner label="Loading revision…" />
      </PortalPageShell>
    )
  }

  if (error || !revision) {
    return (
      <PortalPageShell title="Revision details" description="Could not load revision.">
        <AsyncState error={error ?? new Error('Not found')} onRetry={() => setReloadKey((k) => k + 1)}>
          <span className="sr-only">Revision unavailable</span>
        </AsyncState>
      </PortalPageShell>
    )
  }

  const canApprove = isStaff && revision.status === 'waiting_coordinator_approval'
  const canSubmit = isTutor && revision.status === 'in-revision'
  const canCancelSubmit = isTutor && revision.status === 'waiting_coordinator_approval'

  return (
    <PortalPageShell
      title={revision.title ?? 'Revision session'}
      description={taskId ? `Task ${taskId.slice(0, 8)}…` : 'Revision session'}
      actions={
        <div className="flex flex-wrap gap-2">
          {isStaff ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Edit revision
              </Button>
              {revision.status !== 'cancelled' && revision.status !== 'completed' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActing}
                  onClick={() => runAction('Revision cancelled', () => cancelRevision(revision.id))}
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
                onClick={() => runAction('Revision approved', () => approveRevision(revision.id))}
              >
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isActing}
                onClick={() => runAction('Revision rejected', () => rejectRevision(revision.id))}
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
              onClick={() => runAction('Revision submitted', () => submitRevision(revision.id))}
            >
              Submit revision
            </Button>
          ) : null}
          {canCancelSubmit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isActing}
              onClick={() => runAction('Submission cancelled', () => cancelRevisionSubmit(revision.id))}
            >
              Cancel submission
            </Button>
          ) : null}
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        <Link to={taskPath} className="font-medium text-primary hover:underline">
          Back to task
        </Link>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{revisionStatusLabel(revision.status)}</Badge>
        <span className="text-sm text-muted-foreground">Started {formatDate(revision.startDate)}</span>
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
          <EmptyState title="No revision solutions" description="Tutors can link solutions when submitting." />
        ) : (
          <ul className="space-y-2 text-sm">
            {revision.solutions.map((row) => (
              <li key={row.id} className="rounded-md border p-2 font-mono text-xs">
                Solution {row.solutionId} · {formatDate(row.date)}
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
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
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
            <Textarea id="rev-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </form>
      </Dialog>
    </PortalPageShell>
  )
}
