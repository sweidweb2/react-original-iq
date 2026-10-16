import { Link } from 'react-router-dom'

import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'

export function TaskPaymentsSection({
  task,
  taskId,
  tasksBase,
  canViewPayments,
}: {
  task: TaskDetail
  taskId: string
  tasksBase: string
  canViewPayments: boolean
}) {
  return (
    <SectionCard
      title="Payments"
      description="Payment history and balance."
      actions={
        canViewPayments ? (
          <Link
            to={`${tasksBase}/${taskId}/payments`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View payments
          </Link>
        ) : undefined
      }
    >
      <p className="text-sm text-muted-foreground">
        Payment status: <span className="font-medium text-foreground">{task.paymentStatus}</span> ·
        Price ${task.price.toFixed(2)}
      </p>
    </SectionCard>
  )
}
