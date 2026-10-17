import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldError, FieldLabel } from '@/components/forms'
import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { IconAction } from '@/components/ui/icon-action'
import { SearchField } from '@/components/ui/search-field'
import { Select } from '@/components/ui/select'
import { StarRating } from '@/components/ui/star-rating'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import {
  createFeedback,
  deleteFeedback,
  type FeedbackListMeta,
  type FeedbackRecord,
  listFeedback,
} from '@/services/feedback'
import { listTasks, type Task } from '@/services/tasks'
import { toastApiError, toastSuccess } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { feedbackFormSchema, type FeedbackFormValues } from './feedback.schema'

const PAGE_SIZE = 10

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function isAdminRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'super'
}

export function FeedbackPage() {
  useDocumentTitle('Feedback')
  const role = useAuthStore((state) => state.user?.role)
  const isClient = role === 'client'
  const isAdmin = isAdminRole(role)
  const canList = isAdmin || role === 'tutor' || isClient

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [rows, setRows] = useState<FeedbackRecord[]>([])
  const [meta, setMeta] = useState<FeedbackListMeta | null>(null)
  const [isLoading, setIsLoading] = useState(canList)
  const [error, setError] = useState<unknown>(null)
  const [pendingDelete, setPendingDelete] = useState<FeedbackRecord | null>(null)
  const [isActing, setIsActing] = useState(false)

  const [taskId, setTaskId] = useState('')
  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof FeedbackFormValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientTasks, setClientTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!isClient) return
    let cancelled = false
    setTasksLoading(true)
    listTasks({ page: 1, limit: 100, status: 'completed' })
      .then((result) => {
        if (cancelled) return
        setClientTasks(result.data.filter((task) => task.tutorId))
        setTasksLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setClientTasks([])
        setTasksLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isClient])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if (!canList) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    listFeedback({ page, limit: PAGE_SIZE, search: search || undefined })
      .then((result) => {
        if (cancelled) return
        const totalPages = Math.max(1, Math.ceil(result.meta.total / result.meta.limit))
        if (page > totalPages) {
          setPage(totalPages)
          return
        }
        setRows(result.data)
        setMeta(result.meta)
        setIsLoading(false)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(loadError)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, search, reloadKey, canList])

  function refresh() {
    setReloadKey((value) => value + 1)
  }

  const reviewedTaskIds = new Set(rows.map((row) => row.taskId))
  const reviewableTasks = clientTasks.filter((task) => !reviewedTaskIds.has(task.id))

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = parseForm(feedbackFormSchema, { taskId, rating, comments, suggestions })
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }
    setFieldErrors({})
    const taskTopic = clientTasks.find((task) => task.id === parsed.data.taskId)?.topic
    setIsSubmitting(true)
    try {
      await createFeedback({
        taskId: parsed.data.taskId,
        rating: parsed.data.rating,
        comments: parsed.data.comments || undefined,
        suggestions: parsed.data.suggestions || undefined,
      })
      toastSuccess(
        'Feedback sent',
        `${parsed.data.rating}/5 stars${taskTopic ? ` for “${taskTopic}”` : ''}. Thank you!`,
      )
      setTaskId('')
      setRating(0)
      setComments('')
      setSuggestions('')
      refresh()
    } catch (submitError) {
      toastApiError(
        submitError,
        taskTopic ? `Couldn't send feedback for “${taskTopic}”` : "Couldn't send your feedback",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setIsActing(true)
    try {
      await deleteFeedback(pendingDelete.id)
      toastSuccess('Feedback deleted', `The ${pendingDelete.rating}/5 review was removed.`)
      setPendingDelete(null)
      refresh()
    } catch (actionError) {
      toastApiError(actionError, "Couldn't delete this feedback")
    } finally {
      setIsActing(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / PAGE_SIZE))
  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const rangeEnd = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  const listTitle = isAdmin
    ? 'All feedback'
    : role === 'tutor'
      ? 'Your feedback'
      : 'Your submissions'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Feedback"
        description={
          isClient
            ? 'Rate completed tasks and share comments with the team.'
            : isAdmin
              ? 'Review client feedback across tutors and tasks.'
              : 'Feedback left for your tutoring sessions.'
        }
      />

      {isClient ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <h2 className="text-lg font-semibold">Submit feedback</h2>
            <form className="grid max-w-lg gap-4" onSubmit={handleSubmit}>
              <Field data-invalid={Boolean(fieldErrors.taskId) || undefined}>
                <FieldLabel htmlFor="feedback-task-id">Task</FieldLabel>
                <Select
                  id="feedback-task-id"
                  value={taskId}
                  onChange={(event) => setTaskId(event.target.value)}
                  disabled={tasksLoading || reviewableTasks.length === 0}
                >
                  <option value="">
                    {tasksLoading
                      ? 'Loading tasks…'
                      : reviewableTasks.length === 0
                        ? 'No completed tasks waiting for feedback'
                        : 'Select a task'}
                  </option>
                  {reviewableTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {(task.topic ?? 'Untitled').slice(0, 60)}
                    </option>
                  ))}
                </Select>
                <FieldError>{fieldErrors.taskId}</FieldError>
              </Field>
              <Field data-invalid={Boolean(fieldErrors.rating) || undefined}>
                <FieldLabel>Rating</FieldLabel>
                <StarRating value={rating} onChange={setRating} label="Session rating" />
                <FieldError>{fieldErrors.rating}</FieldError>
              </Field>
              <Field data-invalid={Boolean(fieldErrors.comments) || undefined}>
                <FieldLabel htmlFor="feedback-comments">Comments</FieldLabel>
                <Textarea
                  id="feedback-comments"
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Share your experience…"
                  rows={4}
                />
                <FieldError>{fieldErrors.comments}</FieldError>
              </Field>
              <Field data-invalid={Boolean(fieldErrors.suggestions) || undefined}>
                <FieldLabel htmlFor="feedback-suggestions">Suggestions</FieldLabel>
                <Textarea
                  id="feedback-suggestions"
                  value={suggestions}
                  onChange={(event) => setSuggestions(event.target.value)}
                  placeholder="Optional improvements…"
                  rows={3}
                />
                <FieldError>{fieldErrors.suggestions}</FieldError>
              </Field>
              <Button type="submit" disabled={isSubmitting}>
                Submit feedback
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canList ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{listTitle}</h2>
                <p className="text-sm text-muted-foreground">{meta?.total ?? 0} total entries</p>
              </div>
              <SearchField
                value={searchInput}
                onValueChange={setSearchInput}
                placeholder="Search comments…"
                label="Search feedback"
                className="max-w-xs"
              />
            </div>

            <AsyncState isLoading={isLoading} error={error} onRetry={refresh}>
              {rows.length === 0 ? (
                <EmptyState
                  title="No feedback yet"
                  description="Submitted feedback will appear here."
                />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Rating</th>
                          <th className="px-3 py-2 font-medium">Comments</th>
                          <th className="px-3 py-2 font-medium">Date</th>
                          {isAdmin ? (
                            <th className="px-3 py-2 font-medium text-right">Actions</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2">
                              <StarRating value={row.rating} readOnly label="Rating" />
                            </td>
                            <td className="max-w-xs truncate px-3 py-2">{row.comments ?? '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatDate(row.createdAt)}
                            </td>
                            {isAdmin ? (
                              <td className="px-3 py-2">
                                <div className="flex justify-end">
                                  <IconAction
                                    label="Delete feedback"
                                    tone="danger"
                                    onClick={() => setPendingDelete(row)}
                                  >
                                    <Trash2 className="size-4" />
                                  </IconAction>
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      {meta && meta.total > 0
                        ? `Showing ${rangeStart}–${rangeEnd} of ${meta.total}`
                        : 'No results'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {meta?.page ?? page} of {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((value) => value + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </AsyncState>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={pendingDelete !== null}
        onClose={() => {
          if (!isActing) setPendingDelete(null)
        }}
        title="Delete feedback"
        description="Remove this feedback entry permanently?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={isActing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isActing}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  )
}
