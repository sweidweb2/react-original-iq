import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

import { comingSoon } from '../comingSoon'
import { PortalPageShell, SectionCard } from '../PortalPageShell'

export function TaskPaymentsPage() {
  const { taskId = '—' } = useParams()
  const { pathname } = useLocation()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)

  const taskPath = pathname.replace(/\/payments\/?$/, '')

  return (
    <PortalPageShell
      title="Task payments"
      description={`Payments and refunds for task ${taskId}.`}
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setRefundOpen(true)}>
            Create refund
          </Button>
          <Button type="button" size="sm" onClick={() => setPaymentOpen(true)}>
            Add payment
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        <Link to={taskPath} className="font-medium text-primary hover:underline">
          Back to task
        </Link>
      </p>

      <SectionCard title="Insights" description="Amount due, paid, and refunded.">
        <EmptyState title="No payment insights" description="Totals will appear here once billing is wired." />
      </SectionCard>

      <SectionCard title="Payments" description="Recorded payments for this task.">
        <EmptyState
          title="No payments yet"
          description="Create or delete payments from the actions above."
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => comingSoon('Pay remaining')}>
              Pay remaining
            </Button>
          }
        />
      </SectionCard>

      <SectionCard title="Refunds" description="Refund history and queue.">
        <EmptyState title="No refunds" description="Refund create/delete modals are scaffolded below." />
      </SectionCard>

      <Dialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Create payment"
        description="Record a manual payment or open checkout later."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled>
              Save
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Payment form shell — UI only.</p>
      </Dialog>

      <Dialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Create refund"
        description="Issue a refund against this task."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled>
              Save
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Refund form shell — UI only.</p>
      </Dialog>
    </PortalPageShell>
  )
}
