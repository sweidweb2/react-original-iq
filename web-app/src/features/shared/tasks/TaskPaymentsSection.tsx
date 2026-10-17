import { Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { IconAction } from '@/components/ui/icon-action'
import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'
import { paymentStatusLabel, paymentStatusTone } from './taskDetailsFormat'

export function TaskPaymentsSection({
  task,
  taskId,
  tasksBase,
  canViewPayments,
  canEditPrice,
  onEditPrice,
}: {
  task: TaskDetail
  taskId: string
  tasksBase: string
  canViewPayments: boolean
  canEditPrice: boolean
  onEditPrice: () => void
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
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Payment status</dt>
          <dd className="mt-1">
            <Badge tone={paymentStatusTone(task.paymentStatus)}>
              {paymentStatusLabel(task.paymentStatus)}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Price</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="text-base font-semibold tabular-nums">${task.price.toFixed(2)}</span>
            {canEditPrice ? (
              <IconAction label="Edit price" onClick={onEditPrice}>
                <Pencil className="size-4" aria-hidden />
              </IconAction>
            ) : null}
          </dd>
        </div>
      </dl>
    </SectionCard>
  )
}
