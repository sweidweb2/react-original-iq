import { type FormEvent, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldError, FieldLabel } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SearchField } from '@/components/ui/search-field'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { useCan } from '@/lib/permissions'
import {
  createTask,
  listTasks,
  type Task,
  type TaskListMeta,
  type TaskStatus,
  taskStatusLabel,
} from '@/services/tasks'
import { toastApiError, toastSuccess } from '@/services/toast'
import { listUsers, type ManagedUser, userDisplayName } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { PortalPageShell, SectionCard } from '../PortalPageShell'
import { createTaskFormSchema, type CreateTaskFormValues } from './task-form.schema'
import { taskStatusTone } from './taskDetailsFormat'

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: '' | TaskStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'waiting_coordinator_approval', label: 'Awaiting approval' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const TASK_TYPES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'research', label: 'Research' },
  { value: 'editing', label: 'Editing' },
] as const

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function deadlineToApi(value: string): string {
  const parsed = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`)
  return parsed.toISOString()
}

const emptyCreateForm: CreateTaskFormValues = {
  topic: '',
  type: 'assignment',
  category: '',
  description: '',
  deadline: '',
  clientId: undefined,
}

export function TasksPage() {
  useDocumentTitle('Tasks')
  const { pathname } = useLocation()
  const base = pathname.replace(/\/tasks\/?$/, '') || pathname
  const role = useAuthStore((s) => s.user?.role)
  const can = useCan()
  const ownRequest = role === 'client' && can('create_own_tasks')
  const needsClientPick = !ownRequest && can('create_tasks')
  const canCreate = ownRequest || needsClientPick

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | TaskStatus>('')
  const [rows, setRows] = useState<Task[]>([])
  const [meta, setMeta] = useState<TaskListMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [createValues, setCreateValues] = useState<CreateTaskFormValues>(emptyCreateForm)
  const [createErrors, setCreateErrors] = useState<FieldErrors<keyof CreateTaskFormValues>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [clients, setClients] = useState<ManagedUser[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!createOpen || !needsClientPick) return
    let cancelled = false
    void listUsers({ page: 1, limit: 100, role: 'client', status: 'ACTIVE' })
      .then((result) => {
        if (!cancelled) setClients(result.data)
      })
      .catch(() => {
        if (!cancelled) setClients([])
      })
    return () => {
      cancelled = true
    }
  }, [createOpen, needsClientPick])

  useEffect(() => {
    setPage(1)
  }, [search, status])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await listTasks({
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          status: status || undefined,
        })
        if (cancelled) return
        setRows(result.data)
        setMeta(result.meta)
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
  }, [page, search, status, reloadKey])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (needsClientPick && !createValues.clientId) {
      setCreateErrors({ clientId: 'Select a client' })
      return
    }
    const parsed = parseForm(createTaskFormSchema, createValues)
    if (!parsed.success) {
      setCreateErrors(parsed.fieldErrors)
      return
    }
    setCreateErrors({})
    setIsCreating(true)
    try {
      await createTask({
        topic: parsed.data.topic,
        type: parsed.data.type,
        category: parsed.data.category,
        description: parsed.data.description,
        deadline: deadlineToApi(parsed.data.deadline),
        ...(needsClientPick && parsed.data.clientId ? { clientId: parsed.data.clientId } : {}),
      })
      toastSuccess('Task created', `“${parsed.data.topic}” was added to the task list.`)
      setCreateOpen(false)
      setCreateValues(emptyCreateForm)
      setReloadKey((k) => k + 1)
    } catch (err) {
      toastApiError(err, `Couldn't create “${parsed.data.topic}”`)
    } finally {
      setIsCreating(false)
    }
  }

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1

  return (
    <PortalPageShell
      title="Tasks"
      description="Browse tasks for this portal. Open a row for details, files, payments, and revisions."
      actions={
        canCreate ? (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New task
          </Button>
        ) : undefined
      }
    >
      <SectionCard
        title="Task list"
        description="Filter by status or search topic and description."
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchField
            value={searchInput}
            onValueChange={setSearchInput}
            placeholder="Search tasks…"
            className="sm:max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | TaskStatus)}
            className="sm:max-w-[220px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        ) : error ? (
          <AsyncState error={error} onRetry={() => setReloadKey((k) => k + 1)}>
            <span className="sr-only">Tasks unavailable</span>
          </AsyncState>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description={
              canCreate
                ? 'Create a task to get started.'
                : 'When tasks are assigned to you, they will appear here.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Topic</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Deadline</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((task) => (
                  <tr key={task.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground">{task.topic ?? 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">{task.category ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={taskStatusTone(task.status)}>
                        {taskStatusLabel(task.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatDate(task.deadline)}</td>
                    <td className="px-3 py-2 tabular-nums">${task.price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`${base}/tasks/${task.id}`}
                        className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.total > PAGE_SIZE ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {meta.page} of {totalPages} ({meta.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create task"
        description="Submit a new request. Clients create for themselves; staff can assign later."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="create-task-form" size="sm" disabled={isCreating}>
              {isCreating ? 'Creating…' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="create-task-form" onSubmit={onCreate} className="grid gap-4" noValidate>
          {needsClientPick ? (
            <Field data-invalid={Boolean(createErrors.clientId) || undefined}>
              <FieldLabel htmlFor="task-client">Client</FieldLabel>
              <Select
                id="task-client"
                value={createValues.clientId ?? ''}
                onChange={(e) =>
                  setCreateValues((v) => ({
                    ...v,
                    clientId: e.target.value || undefined,
                  }))
                }
              >
                <option value="">Select client…</option>
                {clients.map((user) => (
                  <option key={user.id} value={user.id}>
                    {userDisplayName(user)}
                  </option>
                ))}
              </Select>
              <FieldError>{createErrors.clientId}</FieldError>
            </Field>
          ) : null}
          <Field data-invalid={Boolean(createErrors.topic) || undefined}>
            <FieldLabel htmlFor="task-topic">Topic</FieldLabel>
            <Input
              id="task-topic"
              placeholder="What do you need help with?"
              value={createValues.topic}
              onChange={(e) => setCreateValues((v) => ({ ...v, topic: e.target.value }))}
            />
            <FieldError>{createErrors.topic}</FieldError>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(createErrors.type) || undefined}>
              <FieldLabel htmlFor="task-type">Type</FieldLabel>
              <Select
                id="task-type"
                value={createValues.type}
                onChange={(e) =>
                  setCreateValues((v) => ({
                    ...v,
                    type: e.target.value as CreateTaskFormValues['type'],
                  }))
                }
              >
                {TASK_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <FieldError>{createErrors.type}</FieldError>
            </Field>
            <Field data-invalid={Boolean(createErrors.category) || undefined}>
              <FieldLabel htmlFor="task-category">Category</FieldLabel>
              <Input
                id="task-category"
                placeholder="e.g. Calculus"
                value={createValues.category}
                onChange={(e) => setCreateValues((v) => ({ ...v, category: e.target.value }))}
              />
              <FieldError>{createErrors.category}</FieldError>
            </Field>
          </div>
          <Field data-invalid={Boolean(createErrors.deadline) || undefined}>
            <FieldLabel htmlFor="task-deadline">Deadline</FieldLabel>
            <Input
              id="task-deadline"
              type="datetime-local"
              value={createValues.deadline}
              onChange={(e) => setCreateValues((v) => ({ ...v, deadline: e.target.value }))}
            />
            <FieldError>{createErrors.deadline}</FieldError>
          </Field>
          <Field data-invalid={Boolean(createErrors.description) || undefined}>
            <FieldLabel htmlFor="task-description">Description</FieldLabel>
            <Textarea
              id="task-description"
              rows={4}
              placeholder="Requirements, instructions, or other details…"
              value={createValues.description}
              onChange={(e) => setCreateValues((v) => ({ ...v, description: e.target.value }))}
            />
            <FieldError>{createErrors.description}</FieldError>
          </Field>
        </form>
      </Dialog>
    </PortalPageShell>
  )
}
