import { type AuthActor, hasPermission } from '../../authz/index.js'
import { forbidden } from '../../errors/app-error.js'
import type { AnalyticsRepository, AnalyticsSnapshot } from './analytics.repository.js'
import type {
  AnalyticsOverviewDto,
  PaymentStatusKey,
  RoleKey,
  TaskStatusKey,
  TaskTypeKey,
} from './analytics.types.js'

export type AnalyticsService = {
  getOverview: (actor: AuthActor) => Promise<AnalyticsOverviewDto>
}

const MONTHS = 6
const RECENT_DAYS = 30
const TOP_TUTORS = 5
const OPEN_STATUSES = new Set(['pending', 'in-progress', 'waiting_coordinator_approval'])

function zeroed<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>
}

function bump<K extends string>(record: Record<K, number>, key: string) {
  if (key in record) record[key as K] += 1
}

function money(value: number | string | null): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function lastMonths(now: Date, count: number): string[] {
  const keys: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))))
  }
  return keys
}

/** Pure aggregation over a snapshot, so it is testable without a database. */
export function summarize(snapshot: AnalyticsSnapshot, now: Date): AnalyticsOverviewDto {
  const recentSince = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000)

  const byRole = zeroed<RoleKey>(['super', 'admin', 'coordinator', 'tutor', 'client'])
  let active = 0
  let newUsers = 0
  for (const user of snapshot.users) {
    bump(byRole, user.role)
    if (user.is_active) active += 1
    if (new Date(user.created_at) >= recentSince) newUsers += 1
  }

  const byStatus = zeroed<TaskStatusKey>([
    'pending',
    'in-progress',
    'waiting_coordinator_approval',
    'completed',
    'cancelled',
  ])
  const byType = zeroed<TaskTypeKey>([
    'assignment',
    'tutoring',
    'research',
    'editing',
    'unspecified',
  ])
  let overdue = 0
  let unassigned = 0
  const prices: number[] = []
  const completedByTutor = new Map<string, number>()
  for (const task of snapshot.tasks) {
    bump(byStatus, task.status)
    bump(byType, task.type ?? 'unspecified')
    const isOpen = OPEN_STATUSES.has(task.status)
    if (isOpen && task.deadline && new Date(task.deadline) < now) overdue += 1
    if (isOpen && !task.tutor_id) unassigned += 1
    const price = money(task.price)
    if (price > 0) prices.push(price)
    if (task.status === 'completed' && task.tutor_id) {
      completedByTutor.set(task.tutor_id, (completedByTutor.get(task.tutor_id) ?? 0) + 1)
    }
  }
  const open = byStatus.pending + byStatus['in-progress'] + byStatus.waiting_coordinator_approval
  const closed = byStatus.completed + byStatus.cancelled

  const payments = zeroed<PaymentStatusKey>(['pending', 'paid', 'failed', 'canceled', 'refunded'])
  const totals = new Map<string, { paid: number; refunded: number }>()
  const totalFor = (currency: string) => {
    const existing = totals.get(currency)
    if (existing) return existing
    const created = { paid: 0, refunded: 0 }
    totals.set(currency, created)
    return created
  }
  for (const payment of snapshot.payments) {
    bump(payments, payment.status)
    if (payment.status === 'paid') totalFor(payment.currency).paid += money(payment.amount)
  }
  for (const refund of snapshot.refunds) {
    if (refund.status === 'paid' || refund.status === 'refunded') {
      totalFor(refund.currency).refunded += money(refund.amount)
    }
  }
  const currencies = [...totals.entries()]
    .map(([currency, total]) => ({
      currency,
      paid: round2(total.paid),
      refunded: round2(total.refunded),
      net: round2(total.paid - total.refunded),
    }))
    .sort((a, b) => b.paid - a.paid)
  const primaryCurrency = currencies[0]?.currency ?? null

  const distribution = [0, 0, 0, 0, 0, 0]
  const ratings: number[] = []
  const ratingsByTutor = new Map<string, number[]>()
  for (const feedback of snapshot.feedbacks) {
    if (feedback.rating === null) continue
    distribution[feedback.rating] = (distribution[feedback.rating] ?? 0) + 1
    ratings.push(feedback.rating)
    const list = ratingsByTutor.get(feedback.tutor_id) ?? []
    list.push(feedback.rating)
    ratingsByTutor.set(feedback.tutor_id, list)
  }

  const months = lastMonths(now, MONTHS)
  const monthly = new Map(
    months.map((month) => [month, { month, tasksCreated: 0, newUsers: 0, revenue: 0 }]),
  )
  for (const task of snapshot.tasks) {
    const bucket = monthly.get(monthKey(new Date(task.created_at)))
    if (bucket) bucket.tasksCreated += 1
  }
  for (const user of snapshot.users) {
    const bucket = monthly.get(monthKey(new Date(user.created_at)))
    if (bucket) bucket.newUsers += 1
  }
  for (const payment of snapshot.payments) {
    if (payment.status !== 'paid' || payment.currency !== primaryCurrency) continue
    const bucket = monthly.get(monthKey(new Date(payment.created_at)))
    if (bucket) bucket.revenue += money(payment.amount)
  }

  const names = new Map(snapshot.users.map((user) => [user.id, user.name]))
  const topTutors = [...completedByTutor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_TUTORS)
    .map(([id, completed]) => ({
      id,
      name: names.get(id) || 'Unknown tutor',
      completed,
      averageRating: average(ratingsByTutor.get(id) ?? []),
    }))

  return {
    generatedAt: now.toISOString(),
    users: { total: snapshot.users.length, active, newLast30Days: newUsers, byRole },
    tasks: {
      total: snapshot.tasks.length,
      open,
      completed: byStatus.completed,
      overdue,
      unassigned,
      completionRate: closed === 0 ? 0 : round2(byStatus.completed / closed),
      byStatus,
      byType,
    },
    revenue: { currencies, payments, averageTaskPrice: average(prices) ?? 0 },
    feedback: { count: ratings.length, averageRating: average(ratings), distribution },
    crm: {
      leads: snapshot.counts.leads,
      leadsLast30Days: snapshot.counts.leadsSince,
      contactMessages: snapshot.counts.contactMessages,
      subscribers: snapshot.counts.subscribers,
    },
    monthly: months.map((month) => {
      const bucket = monthly.get(month) as AnalyticsOverviewDto['monthly'][number]
      return { ...bucket, revenue: round2(bucket.revenue) }
    }),
    topTutors,
  }
}

export function createAnalyticsService(
  repository: AnalyticsRepository,
  clock: () => Date = () => new Date(),
): AnalyticsService {
  return {
    async getOverview(actor) {
      if (!hasPermission(actor, 'view_reports')) {
        throw forbidden('You cannot view analytics')
      }
      const now = clock()
      const since = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000)
      return summarize(await repository.loadSnapshot(since), now)
    },
  }
}
