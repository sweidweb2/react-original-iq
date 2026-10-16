import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AsyncState, EmptyState, InlineSpinner } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import {
  createManualPayment,
  createRefund,
  deletePayment,
  deleteRefund,
  getTaskPayments,
  type PaymentRecord,
  type RefundRecord,
  type TaskPaymentsView,
  updateRefundStatus,
} from '@/services/payments'
import { toastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { PortalPageShell, SectionCard } from '../PortalPageShell'

function formatMoney(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function TaskPaymentsPage() {
  const { taskId = '' } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const isStaff = role === 'admin' || role === 'coordinator' || role === 'super'

  const [view, setView] = useState<TaskPaymentsView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [isActing, setIsActing] = useState(false)

  const taskPath = '..'

  useEffect(() => {
    if (!taskId) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getTaskPayments(taskId)
        if (!cancelled) {
          setView(data)
          if (data.summary.due > 0) setAmount(String(data.summary.due))
        }
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [taskId, reloadKey])

  async function reload() {
    setReloadKey((k) => k + 1)
  }

  async function onManualPayment(event: FormEvent) {
    event.preventDefault()
    if (!taskId) return
    const parsed = Number(amount)
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setIsActing(true)
    try {
      await createManualPayment(taskId, { amount: parsed, status: 'paid', paymentMethod: 'manual' })
      toast.success('Payment recorded')
      setPaymentOpen(false)
      await reload()
    } catch (err) {
      toastApiError(err, 'Could not create payment')
    } finally {
      setIsActing(false)
    }
  }

  async function onRefund(event: FormEvent) {
    event.preventDefault()
    if (!taskId) return
    const parsed = Number(amount)
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setIsActing(true)
    try {
      await createRefund(taskId, { amount: parsed, refundReason: refundReason.trim() || undefined })
      toast.success('Refund created')
      setRefundOpen(false)
      await reload()
    } catch (err) {
      toastApiError(err, 'Could not create refund')
    } finally {
      setIsActing(false)
    }
  }

  async function onDeletePayment(payment: PaymentRecord) {
    if (!taskId) return
    setIsActing(true)
    try {
      await deletePayment(taskId, payment.id)
      toast.success('Payment deleted')
      await reload()
    } catch (err) {
      toastApiError(err, 'Could not delete payment')
    } finally {
      setIsActing(false)
    }
  }

  if (!taskId) {
    return (
      <PortalPageShell title="Task payments" description="Missing task id.">
        <EmptyState title="Invalid link" description="Open payments from a task." />
      </PortalPageShell>
    )
  }

  if (isLoading) {
    return (
      <PortalPageShell title="Task payments" description="Loading billing…">
        <InlineSpinner label="Loading payments…" />
      </PortalPageShell>
    )
  }

  if (error || !view) {
    return (
      <PortalPageShell title="Task payments" description="Could not load payments.">
        <AsyncState error={error ?? new Error('Unavailable')} onRetry={reload}>
          <span className="sr-only">Payments unavailable</span>
        </AsyncState>
      </PortalPageShell>
    )
  }

  const { summary, payments, refunds } = view

  return (
    <PortalPageShell
      title="Task payments"
      description={`Billing for task ${taskId.slice(0, 8)}…`}
      actions={
        <>
          {isStaff ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setRefundOpen(true)}>
                Create refund
              </Button>
              <Button type="button" size="sm" onClick={() => setPaymentOpen(true)}>
                Add payment
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        <Link to={taskPath} className="font-medium text-primary hover:underline">
          Back to task
        </Link>
      </p>

      <SectionCard title="Insights" description="Amount due, paid, and refunded.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(summary.price)}</p>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(summary.paidTotal)}</p>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Refunded</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(summary.refundedTotal)}</p>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Due</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(summary.due)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Status: <Badge tone="neutral">{summary.paymentStatus}</Badge>
        </p>
      </SectionCard>

      <SectionCard title="Payments" description="Recorded payments for this task.">
        {payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description={isStaff ? 'Record a manual payment from the actions above.' : 'Staff will record payments for this task.'}
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <div>
                  <p className="font-medium tabular-nums">
                    {formatMoney(payment.amount, payment.currency)} · {payment.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.paymentMethod ?? payment.gateway} · {formatDate(payment.createdAt)}
                  </p>
                  {payment.paymentUrl ? (
                    <a href={payment.paymentUrl} className="text-xs text-primary hover:underline" target="_blank" rel="noreferrer">
                      Open checkout
                    </a>
                  ) : null}
                </div>
                {isStaff ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isActing}
                    onClick={() => void onDeletePayment(payment)}
                  >
                    Delete
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Refunds" description="Refund history.">
        {refunds.length === 0 ? (
          <EmptyState title="No refunds" description="Staff can issue refunds from the actions above." />
        ) : (
          <ul className="space-y-2 text-sm">
            {refunds.map((refund: RefundRecord) => (
              <li
                key={refund.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-2"
              >
                <div>
                  <p className="font-medium tabular-nums">
                    {formatMoney(refund.amount, refund.currency)} · {refund.status}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(refund.createdAt)}</p>
                  {refund.refundReason ? (
                    <p className="mt-1 text-xs text-muted-foreground">{refund.refundReason}</p>
                  ) : null}
                </div>
                {isStaff && refund.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isActing}
                      onClick={() => {
                        if (!taskId) return
                        setIsActing(true)
                        void updateRefundStatus(taskId, refund.id, 'paid')
                          .then(() => {
                            toast.success('Refund marked paid')
                            return reload()
                          })
                          .catch((err) => toastApiError(err, 'Could not update refund'))
                          .finally(() => setIsActing(false))
                      }}
                    >
                      Mark paid
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isActing}
                      onClick={() => {
                        if (!taskId) return
                        setIsActing(true)
                        void updateRefundStatus(taskId, refund.id, 'canceled')
                          .then(() => {
                            toast.success('Refund canceled')
                            return reload()
                          })
                          .catch((err) => toastApiError(err, 'Could not update refund'))
                          .finally(() => setIsActing(false))
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isActing}
                      onClick={() => {
                        if (!taskId) return
                        setIsActing(true)
                        void deleteRefund(taskId, refund.id)
                          .then(() => {
                            toast.success('Refund deleted')
                            return reload()
                          })
                          .catch((err) => toastApiError(err, 'Could not delete refund'))
                          .finally(() => setIsActing(false))
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Create payment"
        description="Record a manual payment (marked paid)."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="manual-payment-form" size="sm" disabled={isActing}>
              Save
            </Button>
          </>
        }
      >
        <form id="manual-payment-form" onSubmit={onManualPayment}>
          <Field>
            <FieldLabel htmlFor="payment-amount">Amount</FieldLabel>
            <Input
              id="payment-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        </form>
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
            <Button type="submit" form="refund-form" size="sm" disabled={isActing}>
              Save
            </Button>
          </>
        }
      >
        <form id="refund-form" onSubmit={onRefund} className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="refund-amount">Amount</FieldLabel>
            <Input
              id="refund-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="refund-reason">Reason</FieldLabel>
            <Textarea
              id="refund-reason"
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>
    </PortalPageShell>
  )
}
