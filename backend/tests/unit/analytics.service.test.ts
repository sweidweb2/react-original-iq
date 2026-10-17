import { describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import type {
  AnalyticsRepository,
  AnalyticsSnapshot,
} from '../../src/modules/analytics/analytics.repository.js'
import { createAnalyticsService, summarize } from '../../src/modules/analytics/analytics.service.js'

const now = new Date('2026-10-15T12:00:00.000Z')

const snapshot: AnalyticsSnapshot = {
  users: [
    { id: 'a1', name: 'Admin', role: 'admin', is_active: true, created_at: '2025-01-01T00:00:00Z' },
    { id: 't1', name: 'Tina', role: 'tutor', is_active: true, created_at: '2026-10-01T00:00:00Z' },
    { id: 't2', name: 'Tom', role: 'tutor', is_active: false, created_at: '2026-08-10T00:00:00Z' },
    { id: 'c1', name: 'Cara', role: 'client', is_active: true, created_at: '2026-10-10T00:00:00Z' },
  ],
  tasks: [
    {
      tutor_id: 't1',
      type: 'assignment',
      status: 'completed',
      price: '100.00',
      deadline: null,
      created_at: '2026-10-02T00:00:00Z',
    },
    {
      tutor_id: 't1',
      type: 'research',
      status: 'completed',
      price: 50,
      deadline: null,
      created_at: '2026-09-02T00:00:00Z',
    },
    {
      tutor_id: 't2',
      type: 'assignment',
      status: 'completed',
      price: 0,
      deadline: null,
      created_at: '2026-09-05T00:00:00Z',
    },
    {
      tutor_id: null,
      type: null,
      status: 'pending',
      price: 30,
      deadline: '2026-10-01T00:00:00Z',
      created_at: '2026-10-03T00:00:00Z',
    },
    {
      tutor_id: 't2',
      type: 'editing',
      status: 'in-progress',
      price: 20,
      deadline: '2026-12-01T00:00:00Z',
      created_at: '2026-10-04T00:00:00Z',
    },
    {
      tutor_id: 't2',
      type: 'tutoring',
      status: 'cancelled',
      price: 10,
      deadline: null,
      created_at: '2025-01-01T00:00:00Z',
    },
  ],
  payments: [
    { amount: '100.00', currency: 'USD', status: 'paid', created_at: '2026-10-02T00:00:00Z' },
    { amount: 50, currency: 'USD', status: 'paid', created_at: '2026-09-02T00:00:00Z' },
    { amount: 999, currency: 'USD', status: 'failed', created_at: '2026-10-02T00:00:00Z' },
    { amount: 20, currency: 'EUR', status: 'paid', created_at: '2026-10-02T00:00:00Z' },
  ],
  refunds: [
    { amount: 25, currency: 'USD', status: 'paid', created_at: '2026-10-05T00:00:00Z' },
    { amount: 5, currency: 'USD', status: 'pending', created_at: '2026-10-05T00:00:00Z' },
  ],
  feedbacks: [
    { tutor_id: 't1', rating: 5 },
    { tutor_id: 't1', rating: 4 },
    { tutor_id: 't2', rating: 3 },
    { tutor_id: 't2', rating: null },
  ],
  counts: { leads: 9, leadsSince: 2, contactMessages: 4, subscribers: 7 },
}

describe('analytics summarize', () => {
  const overview = summarize(snapshot, now)

  it('counts users by role, activity and recency', () => {
    expect(overview.users).toEqual({
      total: 4,
      active: 3,
      newLast30Days: 2,
      byRole: { super: 0, admin: 1, coordinator: 0, tutor: 2, client: 1 },
    })
  })

  it('summarizes task status, type, overdue and completion rate', () => {
    expect(overview.tasks).toMatchObject({
      total: 6,
      open: 2,
      completed: 3,
      overdue: 1,
      unassigned: 1,
      completionRate: 0.75,
    })
    expect(overview.tasks.byType).toEqual({
      assignment: 2,
      tutoring: 1,
      research: 1,
      editing: 1,
      unspecified: 1,
    })
  })

  it('totals revenue per currency, primary first, net of settled refunds', () => {
    expect(overview.revenue.currencies).toEqual([
      { currency: 'USD', paid: 150, refunded: 25, net: 125 },
      { currency: 'EUR', paid: 20, refunded: 0, net: 20 },
    ])
    expect(overview.revenue.payments).toMatchObject({ paid: 3, failed: 1, pending: 0 })
    expect(overview.revenue.averageTaskPrice).toBe(42)
  })

  it('averages ratings and builds the distribution', () => {
    expect(overview.feedback).toEqual({
      count: 3,
      averageRating: 4,
      distribution: [0, 0, 0, 1, 1, 1],
    })
  })

  it('buckets the last six months, oldest first, in the primary currency', () => {
    expect(overview.monthly.map((m) => m.month)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ])
    expect(overview.monthly.at(-1)).toEqual({
      month: '2026-10',
      tasksCreated: 3,
      newUsers: 2,
      revenue: 100,
    })
    expect(overview.monthly.at(-2)).toMatchObject({ tasksCreated: 2, revenue: 50 })
  })

  it('ranks tutors by completed tasks with their average rating', () => {
    expect(overview.topTutors).toEqual([
      { id: 't1', name: 'Tina', completed: 2, averageRating: 4.5 },
      { id: 't2', name: 'Tom', completed: 1, averageRating: 3 },
    ])
    expect(overview.crm).toEqual({
      leads: 9,
      leadsLast30Days: 2,
      contactMessages: 4,
      subscribers: 7,
    })
  })
})

describe('analytics service', () => {
  const repository: AnalyticsRepository = { loadSnapshot: vi.fn(async () => snapshot) }

  it('lets admins and super read the overview', async () => {
    const service = createAnalyticsService(repository, () => now)
    for (const roles of [['admin'], ['super']] as AuthActor['roles'][]) {
      await expect(service.getOverview({ id: 'x', roles })).resolves.toMatchObject({
        generatedAt: now.toISOString(),
      })
    }
    expect(repository.loadSnapshot).toHaveBeenCalledWith(new Date('2026-09-15T12:00:00.000Z'))
  })

  it('rejects other roles', async () => {
    const service = createAnalyticsService(repository, () => now)
    await expect(service.getOverview({ id: 'x', roles: ['coordinator'] })).rejects.toMatchObject({
      status: 403,
    })
  })
})
