import { apiRequest } from './api'
import type { AuthRole } from './auth'
import type { TaskStatus, TaskType } from './tasks'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded'

export type AnalyticsOverview = {
  generatedAt: string
  users: {
    total: number
    active: number
    newLast30Days: number
    byRole: Record<AuthRole, number>
  }
  tasks: {
    total: number
    open: number
    completed: number
    overdue: number
    unassigned: number
    /** Completed ÷ (completed + cancelled), 0–1. */
    completionRate: number
    byStatus: Record<TaskStatus, number>
    byType: Record<TaskType | 'unspecified', number>
  }
  revenue: {
    /** Largest first; the first entry is the primary currency. */
    currencies: { currency: string; paid: number; refunded: number; net: number }[]
    payments: Record<PaymentStatus, number>
    averageTaskPrice: number
  }
  feedback: {
    count: number
    averageRating: number | null
    /** Index = rating (0–5). */
    distribution: number[]
  }
  crm: {
    leads: number
    leadsLast30Days: number
    contactMessages: number
    subscribers: number
  }
  /** Oldest first; revenue is in the primary currency. */
  monthly: { month: string; tasksCreated: number; newUsers: number; revenue: number }[]
  topTutors: { id: string; name: string; completed: number; averageRating: number | null }[]
}

export function getAnalyticsOverview() {
  return apiRequest<AnalyticsOverview>('/analytics/overview')
}
