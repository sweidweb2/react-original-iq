import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldError, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { type FieldErrors, parseForm } from '@/lib/form'
import { downloadExport } from '@/services/exports'
import { toastApiError } from '@/services/toast'
import {
  createTask,
  getTaskStats,
  listTasks,
  type Task,
  type TaskStats,
  taskStatusLabel,
} from '@/services/tasks'
import type { AuthRole } from '@/services/auth'
import { getUserStats, type UserStats } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { createTaskFormSchema, type CreateTaskFormValues } from '../tasks/task-form.schema'
import { PortalPageShell, SectionCard } from '../PortalPageShell'

const TITLES: Record<AuthRole, { title: string; description: string }> = {
  super: {
    title: 'Super dashboard',
    description: 'Platform activity and audit trail.',
  },
  admin: {
    title: 'Admin dashboard',
    description: 'Platform overview — KPIs, tasks, payments, and exports.',
  },
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

const emptyRequest: CreateTaskFormValues = {
  topic: '',
  type: 'assignment',
  category: '',
  description: '',
  deadline: '',
}

function RecentTasksList({ base, tasks }: { base: string; tasks: Task[] }) {
  if (tasks.length === 0) {
    return <EmptyState title="No tasks to preview" description="Tasks in your scope will appear here." />
  }
  return (
    <ul className="space-y-2 text-sm">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="font-medium">{task.topic ?? 'Untitled'}</p>
            <p className="text-xs text-muted-foreground">{taskStatusLabel(task.status)}</p>
          </div>
          <Link to={`${base}/tasks/${task.id}`} className="text-primary hover:underline">
            Open
          </Link>
        </li>
      ))}
    </ul>
  )
}

function AdminSections({ base }: { base: string }) {
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [recent, setRecent] = useState<Task[]>([])
  const [error, setError] = useState<unknown>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [taskStats, users, tasksPage] = await Promise.all([
          getTaskStats(),
          getUserStats(),
          listTasks({ page: 1, limit: 5 }),
        ])
        if (!cancelled) {
          setStats(taskStats)
          setUserStats(users)
          setRecent(tasksPage.data)
        }
      } catch (err) {
        if (!cancelled) setError(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onExport(resource: Parameters<typeof downloadExport>[0]) {
    setExporting(resource)
    try {
      await downloadExport(resource)
      toast.success(`Downloaded ${resource}.csv`)
    } catch (err) {
      toastApiError(err, 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  if (error) {
    return (
      <AsyncState error={error} onRetry={() => window.location.reload()}>
        <span className="sr-only">Dashboard unavailable</span>
      </AsyncState>
    )
  }

  const openTasks =
    (stats?.pending ?? 0) +
    (stats?.['in-progress'] ?? 0) +
    (stats?.waiting_coordinator_approval ?? 0)

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Open tasks" value={openTasks} />
        <Kpi label="Users" value={userStats?.total ?? '—'} />
        <Kpi label="All tasks" value={stats?.total ?? '—'} />
        <Kpi label="Completed" value={stats?.completed ?? '—'} />
      </div>
      <SectionCard
        title="Tasks preview"
        description="Recent ops tasks."
        actions={
          <Link to={`${base}/tasks`} className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        }
      >
        <RecentTasksList base={base} tasks={recent} />
      </SectionCard>
      <SectionCard
        title="Exports"
        description="Download CSV snapshots for reporting."
      >
        <div className="flex flex-wrap gap-2">
          {(['users', 'tasks', 'payments', 'refunds', 'leads', 'feedback'] as const).map((resource) => (
            <Button
              key={resource}
              type="button"
              variant="outline"
              size="sm"
              disabled={exporting !== null}
              onClick={() => void onExport(resource)}
            >
              {exporting === resource ? 'Exporting…' : resource}
            </Button>
          ))}
        </div>
      </SectionCard>
    </>
  )
}

function CoordinatorSections({ base }: { base: string }) {
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [recent, setRecent] = useState<Task[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [values, setValues] = useState(emptyRequest)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof CreateTaskFormValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    void (async () => {
      const [taskStats, tasksPage] = await Promise.all([
        getTaskStats(),
        listTasks({ page: 1, limit: 5 }),
      ])
      setStats(taskStats)
      setRecent(tasksPage.data)
    })()
  }, [])

  async function onCreate(event: FormEvent) {
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
      toast.success('Task created')
      setValues(emptyRequest)
      setCreateOpen(false)
      const tasksPage = await listTasks({ page: 1, limit: 5 })
      setRecent(tasksPage.data)
    } catch (err) {
      toastApiError(err, 'Could not create task')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Assigned tasks" value={stats?.total ?? '—'} />
        <Kpi label="Pending review" value={stats?.waiting_coordinator_approval ?? '—'} />
        <Kpi label="In progress" value={stats?.['in-progress'] ?? '—'} />
        <Kpi label="Pending" value={stats?.pending ?? '—'} />
      </div>
      <SectionCard
        title="Requests & tasks"
        description="Recent tasks in your queue."
        actions={
          <Button type="button" size="sm" onClick={() => setCreateOpen((o) => !o)}>
            {createOpen ? 'Hide form' : 'Create task'}
          </Button>
        }
      >
        {createOpen ? (
          <form onSubmit={onCreate} className="mb-6 grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors.topic) || undefined} className="sm:col-span-2">
              <FieldLabel htmlFor="dash-topic">Topic</FieldLabel>
              <Input id="dash-topic" value={values.topic} onChange={(e) => setValues((v) => ({ ...v, topic: e.target.value }))} />
              <FieldError>{fieldErrors.topic}</FieldError>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.category) || undefined}>
              <FieldLabel htmlFor="dash-category">Category</FieldLabel>
              <Input id="dash-category" value={values.category} onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))} />
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
            <Field data-invalid={Boolean(fieldErrors.description) || undefined} className="sm:col-span-2">
              <FieldLabel htmlFor="dash-desc">Description</FieldLabel>
              <Textarea id="dash-desc" rows={2} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
              <FieldError>{fieldErrors.description}</FieldError>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit request'}
              </Button>
            </div>
          </form>
        ) : null}
        <RecentTasksList base={base} tasks={recent} />
      </SectionCard>
    </>
  )
}

function TutorSections({ base }: { base: string }) {
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [recent, setRecent] = useState<Task[]>([])

  useEffect(() => {
    void (async () => {
      const [taskStats, tasksPage] = await Promise.all([
        getTaskStats(),
        listTasks({ page: 1, limit: 5 }),
      ])
      setStats(taskStats)
      setRecent(tasksPage.data)
    })()
  }, [])

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Assigned" value={stats?.total ?? '—'} />
        <Kpi label="In progress" value={stats?.['in-progress'] ?? '—'} />
        <Kpi label="Awaiting approval" value={stats?.waiting_coordinator_approval ?? '—'} />
      </div>
      <SectionCard
        title="Assigned tasks"
        description="Work ready to deliver or revise."
        actions={
          <Link to={`${base}/tasks`} className="text-sm font-medium text-primary hover:underline">
            View tasks
          </Link>
        }
      >
        <RecentTasksList base={base} tasks={recent} />
      </SectionCard>
    </>
  )
}

function ClientSections({ base }: { base: string }) {
  const [recent, setRecent] = useState<Task[]>([])
  const [values, setValues] = useState(emptyRequest)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof CreateTaskFormValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    void listTasks({ page: 1, limit: 5 }).then((page) => setRecent(page.data))
  }, [])

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
      toast.success('Request submitted')
      setValues(emptyRequest)
      const page = await listTasks({ page: 1, limit: 5 })
      setRecent(page.data)
    } catch (err) {
      toastApiError(err, 'Could not submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
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
          <Field data-invalid={Boolean(fieldErrors.description) || undefined} className="sm:col-span-2">
            <FieldLabel htmlFor="client-desc">Description</FieldLabel>
            <Textarea
              id="client-desc"
              rows={3}
              value={values.description}
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
      <SectionCard
        title="My requests"
        description="Track submitted tasks."
        actions={
          <Link to={`${base}/tasks`} className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        }
      >
        <RecentTasksList base={base} tasks={recent} />
      </SectionCard>
    </>
  )
}

export function PortalDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? 'client'
  const copy = TITLES[role]
  const base =
    role === 'super' || role === 'admin'
      ? '/admin'
      : role === 'coordinator'
        ? '/coordinator'
        : role === 'tutor'
          ? '/tutor'
          : '/client'

  return (
    <PortalPageShell title={copy.title} description={copy.description}>
      {user ? (
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </p>
      ) : null}
      {role === 'super' || role === 'admin' ? <AdminSections base={base} /> : null}
      {role === 'coordinator' ? <CoordinatorSections base={base} /> : null}
      {role === 'tutor' ? <TutorSections base={base} /> : null}
      {role === 'client' ? <ClientSections base={base} /> : null}
    </PortalPageShell>
  )
}
