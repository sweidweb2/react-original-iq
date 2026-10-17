export type RoleKey = 'super' | 'admin' | 'coordinator' | 'tutor' | 'client'
export type TaskStatusKey =
  'pending' | 'in-progress' | 'waiting_coordinator_approval' | 'completed' | 'cancelled'
export type TaskTypeKey = 'assignment' | 'tutoring' | 'research' | 'editing' | 'unspecified'
export type PaymentStatusKey = 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded'

export type AnalyticsOverviewDto = {
  generatedAt: string
  users: {
    total: number
    active: number
    newLast30Days: number
    byRole: Record<RoleKey, number>
  }
  tasks: {
    total: number
    open: number
    completed: number
    overdue: number
    unassigned: number
    completionRate: number
    byStatus: Record<TaskStatusKey, number>
    byType: Record<TaskTypeKey, number>
  }
  revenue: {
    /** Sorted by paid amount, largest first; the first entry is the primary currency. */
    currencies: { currency: string; paid: number; refunded: number; net: number }[]
    payments: Record<PaymentStatusKey, number>
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
