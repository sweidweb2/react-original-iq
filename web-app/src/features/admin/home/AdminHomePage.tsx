import { useEffect, useState } from 'react'
import { ClipboardList, DollarSign, Star, Users } from 'lucide-react'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { PortalPageShell, SectionCard } from '@/features/shared/PortalPageShell'
import { type AnalyticsOverview, getAnalyticsOverview } from '@/services/analytics'
import { taskStatusLabel } from '@/services/tasks'

import { ColumnChart, HorizontalBars, StatCard } from './AnalyticsCharts'

const ROLE_LABELS = {
  super: 'Super',
  admin: 'Admins',
  coordinator: 'Coordinators',
  tutor: 'Tutors',
  client: 'Students',
} as const

const TYPE_LABELS = {
  assignment: 'Assignment',
  tutoring: 'Tutoring',
  research: 'Research',
  editing: 'Editing',
  unspecified: 'Unspecified',
} as const

const PAYMENT_LABELS = {
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  canceled: 'Canceled',
  refunded: 'Refunded',
} as const

const STATUS_COLORS = {
  pending: 'bg-chart-3',
  'in-progress': 'bg-primary',
  waiting_coordinator_approval: 'bg-accent',
  completed: 'bg-chart-5',
  cancelled: 'bg-destructive',
} as const

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

function formatMonth(month: string): string {
  const [year, index] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(year, index - 1, 1))
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function entries<K extends string>(record: Record<K, number>, labels: Record<K, string>) {
  return (Object.keys(labels) as K[]).map((key) => ({
    key,
    label: labels[key],
    value: record[key] ?? 0,
  }))
}

function Dashboard({ data }: { data: AnalyticsOverview }) {
  const primary = data.revenue.currencies[0]
  const currency = primary?.currency ?? 'USD'
  const money = (value: number) => formatMoney(value, currency)

  const statusItems = (Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map(
    (status) => ({
      key: status,
      label: taskStatusLabel(status),
      value: data.tasks.byStatus[status] ?? 0,
      className: STATUS_COLORS[status],
    }),
  )
  const ratingItems = [5, 4, 3, 2, 1, 0].map((rating) => ({
    key: String(rating),
    label: `${rating} star${rating === 1 ? '' : 's'}`,
    value: data.feedback.distribution[rating] ?? 0,
    className: 'bg-accent',
  }))

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Net revenue"
          icon={<DollarSign className="size-4" aria-hidden />}
          value={money(primary?.net ?? 0)}
          hint={`${money(primary?.paid ?? 0)} paid · ${money(primary?.refunded ?? 0)} refunded`}
        />
        <StatCard
          label="Users"
          icon={<Users className="size-4" aria-hidden />}
          value={data.users.total}
          hint={`${data.users.active} active · +${data.users.newLast30Days} in 30 days`}
        />
        <StatCard
          label="Open tasks"
          icon={<ClipboardList className="size-4" aria-hidden />}
          value={data.tasks.open}
          hint={`${data.tasks.overdue} overdue · ${data.tasks.unassigned} unassigned`}
        />
        <StatCard
          label="Average rating"
          icon={<Star className="size-4" aria-hidden />}
          value={
            data.feedback.averageRating === null ? '—' : data.feedback.averageRating.toFixed(1)
          }
          hint={`${data.feedback.count} rated review${data.feedback.count === 1 ? '' : 's'}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Revenue" description={`Paid payments per month (${currency}).`}>
          <ColumnChart
            label="Monthly revenue"
            items={data.monthly.map((m) => ({
              key: m.month,
              label: formatMonth(m.month),
              value: m.revenue,
            }))}
            format={money}
            barClassName="bg-chart-5"
          />
        </SectionCard>
        <SectionCard title="New tasks" description="Tasks created per month.">
          <ColumnChart
            label="Tasks created per month"
            items={data.monthly.map((m) => ({
              key: m.month,
              label: formatMonth(m.month),
              value: m.tasksCreated,
            }))}
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Tasks by status"
          description={`${data.tasks.total} total · ${percent(data.tasks.completionRate)} completion rate`}
        >
          <HorizontalBars label="Tasks by status" items={statusItems} />
        </SectionCard>
        <SectionCard title="Tasks by type" description="What students ask for.">
          <HorizontalBars
            label="Tasks by type"
            items={entries(data.tasks.byType, TYPE_LABELS).map((item) => ({
              ...item,
              className: 'bg-chart-2',
            }))}
          />
        </SectionCard>
        <SectionCard title="Users by role" description="All accounts, active or not.">
          <HorizontalBars
            label="Users by role"
            items={entries(data.users.byRole, ROLE_LABELS).map((item) => ({
              ...item,
              className: 'bg-chart-1',
            }))}
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Payments"
          description={`Average task price ${money(data.revenue.averageTaskPrice)}.`}
        >
          <HorizontalBars
            label="Payments by status"
            items={entries(data.revenue.payments, PAYMENT_LABELS).map((item) => ({
              ...item,
              className: item.key === 'paid' ? 'bg-chart-5' : 'bg-chart-4',
            }))}
          />
          {data.revenue.currencies.length > 1 ? (
            <ul className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              {data.revenue.currencies.map((row) => (
                <li key={row.currency} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{row.currency}</span>
                  <span className="tabular-nums">{formatMoney(row.net, row.currency)} net</span>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>
        <SectionCard title="Ratings" description="Feedback score distribution.">
          <HorizontalBars label="Rating distribution" items={ratingItems} />
        </SectionCard>
        <SectionCard title="Marketing" description="Leads and inbound contact.">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Leads"
              value={data.crm.leads}
              hint={`+${data.crm.leadsLast30Days} in 30 days`}
            />
            <StatCard label="Subscribers" value={data.crm.subscribers} />
            <StatCard label="Messages" value={data.crm.contactMessages} />
            <StatCard
              label="New users"
              value={data.monthly.at(-1)?.newUsers ?? 0}
              hint="This month"
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Top tutors" description="Most completed tasks.">
        {data.topTutors.length === 0 ? (
          <EmptyState
            title="No completed tasks yet"
            description="Tutors appear here once they complete work."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[480px] text-start text-sm">
              <caption className="sr-only">Top tutors</caption>
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">#</th>
                  <th className="px-3 py-2 text-start font-medium">Tutor</th>
                  <th className="px-3 py-2 text-end font-medium">Completed</th>
                  <th className="px-3 py-2 text-end font-medium">Avg rating</th>
                </tr>
              </thead>
              <tbody>
                {data.topTutors.map((tutor, index) => (
                  <tr key={tutor.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{index + 1}</td>
                    <td className="px-3 py-2 font-medium">{tutor.name}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{tutor.completed}</td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {tutor.averageRating === null ? '—' : tutor.averageRating.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  )
}

export function AdminHomePage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    getAnalyticsOverview()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const refresh = () => setReloadKey((value) => value + 1)

  return (
    <PortalPageShell
      title="Home"
      description="Platform analytics — revenue, users, tasks, and feedback."
      actions={
        <Button type="button" variant="secondary" onClick={refresh} disabled={isLoading}>
          Refresh
        </Button>
      }
    >
      <AsyncState
        isLoading={isLoading && !data}
        error={data ? null : error}
        onRetry={refresh}
        loadingFallback={
          <div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            role="status"
            aria-label="Loading analytics"
          >
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        }
      >
        {data ? <Dashboard data={data} /> : null}
      </AsyncState>
    </PortalPageShell>
  )
}
