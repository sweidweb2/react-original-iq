import { type FormEvent, useEffect, useState } from 'react'
import { CreditCard, Download, Eye, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { AsyncState, EmptyState, InlineSpinner } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { IconAction } from '@/components/ui/icon-action'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePortalBreadcrumbs } from '@/features/portals/usePortalBreadcrumbs'
import { getInvoiceDownloadUrl, resendInvoice } from '@/services/invoices'
import {
  createRefund,
  deletePayment,
  deleteRefund,
  getTaskPayments,
  type PaymentRecord,
  type PaymentStatus,
  type RefundRecord,
  type TaskPaymentsView,
  updateRefundStatus,
} from '@/services/payments'
import { toastApiError, toastFailure, toastInvalid, toastSuccess } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { PortalPageShell, SectionCard } from '../PortalPageShell'
import { PaymentDetailsDialog } from './PaymentDetailsDialog'
import { PaymentFormDialog } from './PaymentFormDialog'
import { SimulatedCheckoutDialog } from './SimulatedCheckoutDialog'
import { paymentStatusLabel, paymentStatusTone } from './taskDetailsFormat'
import { useTaskTopic } from './useTaskTopic'

function formatMoney(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  )
}

const STATUS_TONE: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'danger',
  canceled: 'neutral',
  refunded: 'neutral',
}

export function TaskPaymentsPage() {
  const { taskId = '' } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const isStaff = role === 'admin' || role === 'coordinator' || role === 'super'
  const canResend = role === 'admin' || role === 'super'
  const isClientRole = role === 'client'
  const taskTopic = useTaskTopic(taskId)
  const breadcrumbs = usePortalBreadcrumbs([
    { label: 'Tasks', path: 'tasks' },
    ...(taskId ? [{ label: taskTopic ?? 'Task', path: `tasks/${taskId}?tab=payments` }] : []),
    { label: 'Payments' },
  ])

  const [view, setView] = useState<TaskPaymentsView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<PaymentRecord | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PaymentRecord | null>(null)

  const [refundOpen, setRefundOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [isActing, setIsActing] = useState(false)

  useEffect(() => {
    if (!taskId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    getTaskPayments(taskId)
      .then((data) => {
        if (!cancelled) setView(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [taskId, reloadKey])

  function reload() {
    setReloadKey((k) => k + 1)
  }

  async function onRefund(event: FormEvent) {
    event.preventDefault()
    const parsed = Number(refundAmount)
    if (Number.isNaN(parsed) || parsed <= 0) {
      toastInvalid('Invalid refund amount', 'Enter an amount greater than 0, e.g. 25.00.')
      return
    }
    setIsActing(true)
    try {
      await createRefund(taskId, { amount: parsed, refundReason: refundReason.trim() || undefined })
      toastSuccess('Refund requested', `${formatMoney(parsed)} is pending until it's marked paid.`)
      setRefundOpen(false)
      setRefundAmount('')
      setRefundReason('')
      reload()
    } catch (err) {
      toastApiError(err, `Couldn't request a refund of ${formatMoney(parsed)}`)
    } finally {
      setIsActing(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const amount = formatMoney(pendingDelete.amount, pendingDelete.currency)
    setIsActing(true)
    try {
      await deletePayment(taskId, pendingDelete.id)
      toastSuccess('Payment deleted', `The ${amount} payment was removed.`)
      setPendingDelete(null)
      reload()
    } catch (err) {
      toastApiError(err, `Couldn't delete the ${amount} payment`)
    } finally {
      setIsActing(false)
    }
  }

  async function onDownloadInvoice(payment: PaymentRecord) {
    if (!payment.invoice) return
    try {
      const { url } = await getInvoiceDownloadUrl(payment.invoice.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toastApiError(err, `Couldn't open invoice ${payment.invoice.invoiceNumber}`)
    }
  }

  async function onResendInvoice(payment: PaymentRecord) {
    if (!payment.invoice) return
    setIsActing(true)
    try {
      const invoice = await resendInvoice(payment.invoice.id)
      if (invoice.invoiceStatus === 'sent') {
        toastSuccess('Invoice sent', `Invoice ${invoice.invoiceNumber} was emailed to the client.`)
      } else {
        toastFailure(
          `Invoice ${invoice.invoiceNumber} wasn't delivered`,
          "The email couldn't be sent. Check the client's email address and try again.",
          invoice.lastError,
        )
      }
      reload()
    } catch (err) {
      toastApiError(err, `Couldn't resend invoice ${payment.invoice.invoiceNumber}`)
    } finally {
      setIsActing(false)
    }
  }

  async function onRefundStatus(refund: RefundRecord, status: 'paid' | 'canceled') {
    const amount = formatMoney(refund.amount, refund.currency)
    setIsActing(true)
    try {
      await updateRefundStatus(taskId, refund.id, status)
      if (status === 'paid')
        toastSuccess('Refund marked paid', `${amount} was returned to the client.`)
      else toastSuccess('Refund canceled', `The ${amount} refund won't be paid.`)
      reload()
    } catch (err) {
      toastApiError(
        err,
        status === 'paid'
          ? `Couldn't mark the ${amount} refund as paid`
          : `Couldn't cancel the ${amount} refund`,
      )
    } finally {
      setIsActing(false)
    }
  }

  async function onDeleteRefund(refund: RefundRecord) {
    const amount = formatMoney(refund.amount, refund.currency)
    setIsActing(true)
    try {
      await deleteRefund(taskId, refund.id)
      toastSuccess('Refund deleted', `The ${amount} refund was removed.`)
      reload()
    } catch (err) {
      toastApiError(err, `Couldn't delete the ${amount} refund`)
    } finally {
      setIsActing(false)
    }
  }

  if (!taskId) {
    return (
      <PortalPageShell
        title="Task payments"
        description="Missing task id."
        breadcrumbs={breadcrumbs}
      >
        <EmptyState title="Invalid link" description="Open payments from a task." />
      </PortalPageShell>
    )
  }

  if (isLoading && !view) {
    return (
      <PortalPageShell
        title="Task payments"
        description="Loading billing…"
        breadcrumbs={breadcrumbs}
      >
        <InlineSpinner label="Loading payments…" />
      </PortalPageShell>
    )
  }

  if (error || !view) {
    return (
      <PortalPageShell
        title="Task payments"
        description="Could not load payments."
        breadcrumbs={breadcrumbs}
      >
        <AsyncState error={error ?? new Error('Unavailable')} onRetry={reload}>
          <span className="sr-only">Payments unavailable</span>
        </AsyncState>
      </PortalPageShell>
    )
  }

  const { summary, payments, refunds } = view
  const canPay = isClientRole && summary.due > 0

  return (
    <PortalPageShell
      title="Task payments"
      description="Billing, invoices, and refunds for this task."
      breadcrumbs={breadcrumbs}
      actions={
        <>
          {canPay ? (
            <Button type="button" size="sm" onClick={() => setCheckoutOpen(true)}>
              <CreditCard className="size-4" aria-hidden />
              Pay now
            </Button>
          ) : null}
          {isStaff ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRefundOpen(true)}
              >
                Create refund
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditing(null)
                  setFormMode('create')
                }}
              >
                Add payment
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <SectionCard title="Insights" description="Amount due, paid, and refunded.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Price', value: summary.price },
            { label: 'Paid', value: summary.paidTotal },
            { label: 'Refunded', value: summary.refundedTotal },
            { label: 'Due', value: summary.due },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(item.value)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Status:{' '}
          <Badge tone={paymentStatusTone(summary.paymentStatus)}>
            {paymentStatusLabel(summary.paymentStatus)}
          </Badge>
        </p>
      </SectionCard>

      <SectionCard title="Payments" description="Recorded payments and their invoices.">
        {payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description={
              canPay
                ? 'Use "Pay now" to settle the balance.'
                : isStaff
                  ? 'Record a manual payment from the actions above.'
                  : 'No payments recorded for this task.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <caption className="sr-only">Payments</caption>
              <thead className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Method</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Invoice</th>
                  <th className="px-2 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-2 py-3 font-medium tabular-nums">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {payment.paymentMethod ?? '—'}
                      <span className="block text-xs">{payment.gateway}</span>
                    </td>
                    <td className="px-2 py-3">
                      <Badge tone={STATUS_TONE[payment.status]}>{payment.status}</Badge>
                    </td>
                    <td className="px-2 py-3">
                      {payment.invoice ? (
                        <div>
                          <span className="font-mono text-xs">{payment.invoice.invoiceNumber}</span>
                          <Badge
                            tone={
                              payment.invoice.invoiceStatus === 'sent'
                                ? 'success'
                                : payment.invoice.invoiceStatus === 'failed'
                                  ? 'danger'
                                  : 'neutral'
                            }
                            className="ms-2"
                          >
                            {payment.invoice.invoiceStatus ?? 'pending'}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-center gap-1.5">
                        <IconAction label="View details" onClick={() => setViewingId(payment.id)}>
                          <Eye className="size-4" />
                        </IconAction>
                        {payment.invoice?.hasPdf ? (
                          <IconAction
                            label="Download invoice"
                            onClick={() => void onDownloadInvoice(payment)}
                          >
                            <Download className="size-4" />
                          </IconAction>
                        ) : null}
                        {canResend &&
                        payment.invoice &&
                        payment.invoice.invoiceStatus !== 'sent' ? (
                          <IconAction
                            label="Resend invoice"
                            disabled={isActing}
                            onClick={() => void onResendInvoice(payment)}
                          >
                            <RefreshCw className="size-4" />
                          </IconAction>
                        ) : null}
                        {isStaff ? (
                          <>
                            <IconAction
                              label="Edit payment"
                              onClick={() => {
                                setEditing(payment)
                                setFormMode('edit')
                              }}
                            >
                              <Pencil className="size-4" />
                            </IconAction>
                            {!payment.invoice && payment.voidedInvoices.length === 0 ? (
                              <IconAction
                                label="Delete payment"
                                tone="danger"
                                disabled={isActing}
                                onClick={() => setPendingDelete(payment)}
                              >
                                <Trash2 className="size-4" />
                              </IconAction>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Refunds" description="Refund history.">
        {refunds.length === 0 ? (
          <EmptyState
            title="No refunds"
            description="Staff can issue refunds from the actions above."
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {refunds.map((refund) => (
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
                      onClick={() => void onRefundStatus(refund, 'paid')}
                    >
                      Mark paid
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isActing}
                      onClick={() => void onRefundStatus(refund, 'canceled')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="danger-soft"
                      size="sm"
                      disabled={isActing}
                      onClick={() => void onDeleteRefund(refund)}
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

      <SimulatedCheckoutDialog
        open={checkoutOpen}
        taskId={taskId}
        due={summary.due}
        onClose={() => setCheckoutOpen(false)}
        onPaid={reload}
      />

      <PaymentFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        taskId={taskId}
        payment={editing}
        due={summary.due}
        onClose={() => setFormMode(null)}
        onSaved={reload}
      />

      <PaymentDetailsDialog
        open={viewingId !== null}
        taskId={taskId}
        paymentId={viewingId}
        onClose={() => setViewingId(null)}
      />

      <Dialog
        open={pendingDelete !== null}
        onClose={() => {
          if (!isActing) setPendingDelete(null)
        }}
        title="Delete payment"
        description={
          pendingDelete
            ? `Delete the ${formatMoney(pendingDelete.amount, pendingDelete.currency)} payment? The task balance will be recalculated.`
            : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={isActing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => void confirmDelete()}
              disabled={isActing}
            >
              {isActing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Delete
            </Button>
          </>
        }
      />

      <Dialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Create refund"
        description="Issue a refund against this task."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRefundOpen(false)}
            >
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
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
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
