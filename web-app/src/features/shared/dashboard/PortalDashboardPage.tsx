import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AuthRole } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

import { comingSoon } from '../comingSoon'
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
    description: 'Ops overview — requests, kanban, tutors, and leaderboard.',
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

function KpiStub({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">—</p>
    </div>
  )
}

function AdminSections({ base }: { base: string }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStub label="Open tasks" />
        <KpiStub label="Users" />
        <KpiStub label="Payments" />
        <KpiStub label="Leads" />
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
        <EmptyState title="No tasks to preview" description="Task list will populate this section." />
      </SectionCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Payments & refunds" description="Manual payment and refund queue.">
          <EmptyState title="No money activity" description="Modals live on task payments pages." />
        </SectionCard>
        <SectionCard
          title="Feedback"
          description="Latest ratings."
          actions={
            <Link to={`${base}/feedback`} className="text-sm font-medium text-primary hover:underline">
              Open feedback
            </Link>
          }
        >
          <EmptyState title="No feedback" description="Feedback rows will appear here." />
        </SectionCard>
      </div>
      <SectionCard
        title="Exports"
        description="CSV / PDF exports (also on profile later)."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => comingSoon('Exports')}>
            Run export
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">Export actions are scaffolded — wiring comes later.</p>
      </SectionCard>
    </>
  )
}

function CoordinatorSections({ base }: { base: string }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStub label="Assigned tasks" />
        <KpiStub label="Pending review" />
        <KpiStub label="Tutors" />
        <KpiStub label="Clients" />
      </div>
      <SectionCard
        title="Requests & kanban"
        description="Intake board and create-task entry."
        actions={
          <Button type="button" size="sm" onClick={() => comingSoon('Create task')}>
            Create task
          </Button>
        }
      >
        <EmptyState
          title="Board empty"
          description="Kanban columns will land here."
          action={
            <Link to={`${base}/tasks`} className="text-sm font-medium text-primary hover:underline">
              Open tasks
            </Link>
          }
        />
      </SectionCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Tutors & clients" description="Quick profile management entry.">
          <EmptyState
            title="No people listed"
            description="Open manage-user from task details later."
            action={
              <Link
                to={`${base}/users/example`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Preview manage user
              </Link>
            }
          />
        </SectionCard>
        <SectionCard title="Leaderboard" description="Tutor performance ranking.">
          <EmptyState title="No leaderboard data" description="Scores will appear here." />
        </SectionCard>
      </div>
    </>
  )
}

function TutorSections({ base }: { base: string }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiStub label="Assigned" />
        <KpiStub label="In progress" />
        <KpiStub label="Submitted" />
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
        <EmptyState title="No assignments" description="Assigned tasks will list here." />
      </SectionCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Performance" description="Delivery and revision stats.">
          <EmptyState title="No performance data" description="Charts and totals come later." />
        </SectionCard>
        <SectionCard
          title="Feedback"
          description="Ratings on your work."
          actions={
            <Link to={`${base}/feedback`} className="text-sm font-medium text-primary hover:underline">
              Open feedback
            </Link>
          }
        >
          <EmptyState title="No feedback yet" description="Client ratings will appear here." />
        </SectionCard>
      </div>
    </>
  )
}

function ClientSections({ base }: { base: string }) {
  return (
    <>
      <SectionCard
        title="Request help"
        description="Create a new task request (topic, type, files)."
        actions={
          <Button type="button" size="sm" onClick={() => comingSoon('Submit request')}>
            Submit request
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Topic</span>
            <Input disabled placeholder="What do you need help with?" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Type</span>
            <Input disabled placeholder="Assignment / tutoring / …" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Deadline</span>
            <Input disabled type="date" />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Description</span>
            <Textarea disabled rows={3} placeholder="Details…" />
          </label>
        </div>
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
        <EmptyState title="No requests yet" description="After you submit, tasks show as pending here." />
      </SectionCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Billing" description="Balances and invoices.">
          <EmptyState
            title="No billing activity"
            description="Open a task to pay remaining balance."
            action={
              <Link
                to={`${base}/tasks/example/payments`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Preview payments
              </Link>
            }
          />
        </SectionCard>
        <SectionCard
          title="Feedback"
          description="Rate completed work."
          actions={
            <Link to={`${base}/feedback`} className="text-sm font-medium text-primary hover:underline">
              Give feedback
            </Link>
          }
        >
          <EmptyState title="Nothing to rate" description="Feedback UI is ready when tasks complete." />
        </SectionCard>
      </div>
    </>
  )
}

export function PortalDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? 'client'
  const copy = TITLES[role]
  const base =
    role === 'admin'
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
      {role === 'admin' ? <AdminSections base={base} /> : null}
      {role === 'coordinator' ? <CoordinatorSections base={base} /> : null}
      {role === 'tutor' ? <TutorSections base={base} /> : null}
      {role === 'client' ? <ClientSections base={base} /> : null}
    </PortalPageShell>
  )
}
