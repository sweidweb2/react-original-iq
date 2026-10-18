import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldError, FieldLabel } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAsyncData } from '@/hooks'
import { type FieldErrors, parseForm } from '@/lib/form'
import { useCan } from '@/lib/permissions'
import type { AuthRole } from '@/services/auth'
import {
  createTask,
  getTaskStats,
  listTasks,
  type Task,
  type TaskStats,
  taskStatusLabel,
} from '@/services/tasks'
import { toastApiError, toastSuccess } from '@/services/toast'
import { listUsers, type ManagedUser, userDisplayName } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { PortalPageShell, SectionCard } from '../PortalPageShell'
import { createTaskFormSchema, type CreateTaskFormValues } from '../tasks/task-form.schema'
import { taskStatusTone } from '../tasks/taskDetailsFormat'

/** Super and admin have their own home pages (activity log, analytics). */
type DashboardRole = Exclude<AuthRole, 'super' | 'admin'>

const TITLES: Record<DashboardRole, { title: string; description: string }> = {
  coordinator: {
    title: 'Coordinator dashboard',
    description: 'Ops overview — requests, tasks, and workload.',
  },
  tutor: {
    title: 'Tutor dashboard',
    description: 'Assigned work, performance, and feedback.',
  },
  client: {
    title: 'Client dashboard',
    description: 'Request help, track requests, billing, and feedback.',
  },
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function deadlineToApi(value: string): string {
  const parsed = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`)
  return parsed.toISOString()
}

async function loadStatsAndRecent(): Promise<{ stats: TaskStats; recent: Task[] }> {
  const [stats, tasksPage] = await Promise.all([getTaskStats(), listTasks({ page: 1, limit: 5 })])
  return { stats, recent: tasksPage.data }
}

async function loadRecent(): Promise<Task[]> {
  const page = await listTasks({ page: 1, limit: 5 })
  return page.data
}

const emptyRequest: CreateTaskFormValues = {
  topic: '',
  type: 'assignment',
  category: '',
  description: '',
  deadline: '',
}

function RecentTasksList({ base, tasks }: { base: string; tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <EmptyState title="No tasks to preview" description="Tasks in your scope will appear here." />
    )
  }
  return (
    <ul className="space-y-2 text-sm">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{task.topic ?? 'Untitled'}</p>
            <Badge tone={taskStatusTone(task.status)} className="mt-1">
              {taskStatusLabel(task.status)}
            </Badge>
          </div>
          <Link
            to={`${base}/tasks/${task.id}`}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            Open
          </Link>
        </li>
      ))}
    </ul>
  )
}

function CoordinatorSections({ base }: { base: string }) {
  const { data, isLoading, error, reload } = useAsyncData(loadStatsAndRecent)
  const stats = data?.stats
  const canCreate = useCan()('create_tasks')
  const [createOpen, setCreateOpen] = useState(false)
  const [values, setValues] = useState(emptyRequest)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof CreateTaskFormValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<ManagedUser[]>([])

  useEffect(() => {
    if (!createOpen) return
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
  }, [createOpen])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (!values.clientId) {
      setFieldErrors({ clientId: 'Select a client' })
      return
    }
    const parsed = parseForm(createTaskFormSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }
    setIsSubmitting(true)
    try {
      await createTask({
        ...parsed.data,
        clientId: values.clientId,
        deadline: deadlineToApi(parsed.data.deadline),
      })
      toastSuccess('Task created', `“${parsed.data.topic}” was added to the task list.`)
      setValues(emptyRequest)
      setFieldErrors({})
      setCreateOpen(false)
      reload()
    } catch (err) {
      toastApiError(err, `Couldn't create “${parsed.data.topic}”`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Assigned tasks" value={stats?.total ?? '—'} />
          <Kpi label="Pending review" value={stats?.waiting_coordinator_approval ?? '—'} />
          <Kpi label="In progress" value={stats?.['in-progress'] ?? '—'} />
          <Kpi label="Pending" value={stats?.pending ?? '—'} />
        </div>
      </AsyncState>
      <SectionCard
        title="Requests & tasks"
        description="Recent tasks in your queue."
        actions={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen((o) => !o)}>
              {createOpen ? 'Hide form' : 'Create task'}
            </Button>
          ) : undefined
        }
      >
        {canCreate && createOpen ? (
          <form
            onSubmit={onCreate}
            className="mb-6 grid gap-3 rounded-lg border p-4 sm:grid-cols-2"
          >
            <Field
              data-invalid={Boolean(fieldErrors.clientId) || undefined}
              className="sm:col-span-2"
            >
              <FieldLabel htmlFor="dash-client">Client</FieldLabel>
              <Select
                id="dash-client"
                value={values.clientId ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, clientId: e.target.value || undefined }))
                }
              >
                <option value="">Select client…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {userDisplayName(client)}
                  </option>
                ))}
              </Select>
              <FieldError>{fieldErrors.clientId}</FieldError>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.topic) || undefined} className="sm:col-span-2">
              <FieldLabel htmlFor="dash-topic">Topic</FieldLabel>
              <Input
                id="dash-topic"
                value={values.topic}
                placeholder="What does the client need help with?"
                onChange={(e) => setValues((v) => ({ ...v, topic: e.target.value }))}
              />
              <FieldError>{fieldErrors.topic}</FieldError>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.category) || undefined}>
              <FieldLabel htmlFor="dash-category">Category</FieldLabel>
              <Input
                id="dash-category"
                value={values.category}
                placeholder="e.g. Calculus"
                onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
              />
              <FieldError>{fieldErrors.category}</FieldError>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.deadline) || undefined}>
              <FieldLabel htmlFor="dash-deadline">Deadline</FieldLabel>
              <Input
                id="dash-deadline"
                type="datetime-local"
                value={values.deadline}
                onChange={(e) => setValues((v) => ({ ...v, deadline: e.target.value }))}
              />
              <FieldError>{fieldErrors.deadline}</FieldError>
            </Field>
            <Field
              data-invalid={Boolean(fieldErrors.description) || undefined}
              className="sm:col-span-2"
            >
              <FieldLabel htmlFor="dash-desc">Description</FieldLabel>
              <Textarea
                id="dash-desc"
                rows={2}
                value={values.description}
                placeholder="Requirements, instructions, or other details…"
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              />
              <FieldError>{fieldErrors.description}</FieldError>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit request'}
              </Button>
            </div>
          </form>
        ) : null}
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <RecentTasksList base={base} tasks={data?.recent ?? []} />
        </AsyncState>
      </SectionCard>
    </>
  )
}

function TutorSections({ base }: { base: string }) {
  const { data, isLoading, error, reload } = useAsyncData(loadStatsAndRecent)
  const stats = data?.stats

  return (
    <>
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi label="Assigned" value={stats?.total ?? '—'} />
          <Kpi label="In progress" value={stats?.['in-progress'] ?? '—'} />
          <Kpi label="Awaiting approval" value={stats?.waiting_coordinator_approval ?? '—'} />
        </div>
      </AsyncState>
      <SectionCard
        title="Assigned tasks"
        description="Work ready to deliver or revise."
        actions={
          <Link to={`${base}/tasks`} className="text-sm font-medium text-primary hover:underline">
            View tasks
          </Link>
        }
      >
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <RecentTasksList base={base} tasks={data?.recent ?? []} />
        </AsyncState>
      </SectionCard>
    </>
  )
}

function ClientSections({ base }: { base: string }) {
  const { data: recent, isLoading, error, reload } = useAsyncData(loadRecent)
  const canRequest = useCan()('create_own_tasks')
  const [values, setValues] = useState(emptyRequest)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof CreateTaskFormValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(createTaskFormSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }
    setIsSubmitting(true)
    try {
      await createTask({
        ...parsed.data,
        deadline: deadlineToApi(parsed.data.deadline),
      })
      toastSuccess(
        'Request submitted',
        `“${parsed.data.topic}” was sent. A coordinator will review it and assign a tutor.`,
      )
      setValues(emptyRequest)
      setFieldErrors({})
      reload()
    } catch (err) {
      toastApiError(err, `Couldn't submit “${parsed.data.topic}”`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {canRequest ? (
        <SectionCard title="Request help" description="Create a new task request.">
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors.topic) || undefined} className="sm:col-span-2">
              <FieldLabel htmlFor="client-topic">Topic</FieldLabel>
              <Input
                id="client-topic"
                value={values.topic}
                placeholder="What do you need help with?"
                onChange={(e) => setValues((v) => ({ ...v, topic: e.target.value }))}
              />
              <FieldError>{fieldErrors.topic}</FieldError>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.type) || undefined}>
              <FieldLabel htmlFor="client-type">Type</FieldLabel>
              <Select
                id="client-type"
                value={values.type}
                onChange={(e) =>
                  setValues((v) => ({ ...v, type: e.target.value as CreateTaskFormValues['type'] }))
                }
              >
                <option value="assignment">Assignment</option>
                <option value="tutoring">Tutoring</option>
                <option value="research">Research</option>
                <option value="editing">Editing</option>
              </Select>
              <FieldError>{fieldErrors.type}</FieldError>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.category) || undefined}>
              <FieldLabel htmlFor="client-category">Category</FieldLabel>
              <Input
                id="client-category"
                value={values.category}
                placeholder="e.g. Calculus"
                onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
              />
              <FieldError>{fieldErrors.category}</FieldError>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.deadline) || undefined}>
              <FieldLabel htmlFor="client-deadline">Deadline</FieldLabel>
              <Input
                id="client-deadline"
                type="datetime-local"
                value={values.deadline}
                onChange={(e) => setValues((v) => ({ ...v, deadline: e.target.value }))}
              />
              <FieldError>{fieldErrors.deadline}</FieldError>
            </Field>
            <Field
              data-invalid={Boolean(fieldErrors.description) || undefined}
              className="sm:col-span-2"
            >
              <FieldLabel htmlFor="client-desc">Description</FieldLabel>
              <Textarea
                id="client-desc"
                rows={3}
                value={values.description}
                placeholder="Requirements, instructions, or other details…"
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              />
              <FieldError>{fieldErrors.description}</FieldError>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit request'}
              </Button>
            </div>
          </form>
        </SectionCard>
      ) : null}
      <SectionCard
        title="My requests"
        description="Track submitted tasks."
        actions={
          <Link to={`${base}/tasks`} className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        }
      >
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <RecentTasksList base={base} tasks={recent ?? []} />
        </AsyncState>
      </SectionCard>
    </>
  )
}

export function PortalDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const role: DashboardRole =
    user?.role === 'coordinator' || user?.role === 'tutor' ? user.role : 'client'
  const copy = TITLES[role]
  const base = `/${role}`

  return (
    <PortalPageShell title={copy.title} description={copy.description}>
      {user ? (
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </p>
      ) : null}
      {role === 'coordinator' ? <CoordinatorSections base={base} /> : null}
      {role === 'tutor' ? <TutorSections base={base} /> : null}
      {role === 'client' ? <ClientSections base={base} /> : null}
    </PortalPageShell>
  )
}
