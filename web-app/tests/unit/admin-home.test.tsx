import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminHomePage } from '@/features/admin/home/AdminHomePage'
import type { AnalyticsOverview } from '@/services/analytics'

const overview: AnalyticsOverview = {
  generatedAt: '2026-10-15T12:00:00.000Z',
  users: {
    total: 12,
    active: 10,
    newLast30Days: 3,
    byRole: { super: 1, admin: 1, coordinator: 2, tutor: 3, client: 5 },
  },
  tasks: {
    total: 8,
    open: 4,
    completed: 3,
    overdue: 1,
    unassigned: 2,
    completionRate: 0.75,
    byStatus: {
      pending: 2,
      'in-progress': 1,
      waiting_coordinator_approval: 1,
      completed: 3,
      cancelled: 1,
    },
    byType: { assignment: 4, tutoring: 1, research: 1, editing: 1, unspecified: 1 },
  },
  revenue: {
    currencies: [{ currency: 'USD', paid: 150, refunded: 25, net: 125 }],
    payments: { pending: 1, paid: 3, failed: 1, canceled: 0, refunded: 0 },
    averageTaskPrice: 42,
  },
  feedback: { count: 3, averageRating: 4, distribution: [0, 0, 0, 1, 1, 1] },
  crm: { leads: 9, leadsLast30Days: 2, contactMessages: 4, subscribers: 7 },
  monthly: [
    { month: '2026-09', tasksCreated: 2, newUsers: 1, revenue: 50 },
    { month: '2026-10', tasksCreated: 3, newUsers: 2, revenue: 100 },
  ],
  topTutors: [{ id: 't1', name: 'Tina Tutor', completed: 2, averageRating: 4.5 }],
}

vi.mock('@/services/analytics', () => ({
  getAnalyticsOverview: vi.fn(async () => overview),
}))

describe('AdminHomePage', () => {
  afterEach(() => {
    cleanup()
  })

  it('is titled Home and shows analytics instead of exports', async () => {
    render(
      <MemoryRouter>
        <AdminHomePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible()
    expect(await screen.findByText('$125.00')).toBeVisible()
    expect(screen.getByText('10 active · +3 in 30 days')).toBeVisible()
    expect(screen.getByText('1 overdue · 2 unassigned')).toBeVisible()
    expect(screen.getByText('4.0')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Monthly revenue' })).toBeVisible()
    expect(screen.getByRole('list', { name: 'Tasks by status' })).toBeVisible()
    expect(screen.getByRole('cell', { name: 'Tina Tutor' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument()
  })
})
