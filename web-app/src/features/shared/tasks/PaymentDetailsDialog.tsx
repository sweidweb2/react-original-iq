import { useEffect, useState } from 'react'

import { InlineSpinner } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getPayment, type PaymentDetail } from '@/services/payments'
import { toastApiError } from '@/services/toast'

type PaymentDetailsDialogProps = {
  open: boolean
  taskId: string
  paymentId: string | null
  onClose: () => void
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input value={value} readOnly />
    </Field>
  )
}

export function PaymentDetailsDialog({
  open,
  taskId,
  paymentId,
  onClose,
}: PaymentDetailsDialogProps) {
  const [detail, setDetail] = useState<PaymentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !paymentId) return
    let cancelled = false
    setIsLoading(true)
    setDetail(null)
    getPayment(taskId, paymentId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) toastApiError(error, "Couldn't load the payment details")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, taskId, paymentId])

  const invoice = detail?.invoice

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Payment details"
      description={
        detail ? `${detail.amount.toFixed(2)} ${detail.currency} · ${detail.status}` : undefined
      }
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {isLoading || !detail ? (
        <InlineSpinner label="Loading payment…" />
      ) : (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <DetailRow label="Created" value={formatWhen(detail.createdAt)} />
          <DetailRow label="Updated" value={formatWhen(detail.updatedAt)} />
          <DetailRow label="Amount" value={`${detail.amount.toFixed(2)} ${detail.currency}`} />
          <DetailRow label="Status" value={detail.status} />
          <DetailRow label="Gateway" value={detail.gateway} />
          <DetailRow label="Method" value={detail.paymentMethod ?? '—'} />
          <DetailRow label="Invoice" value={invoice ? invoice.invoiceNumber : 'None'} />
          {invoice ? (
            <>
              <DetailRow label="Invoice status" value={invoice.invoiceStatus ?? 'pending'} />
              <DetailRow label="Emailed at" value={formatWhen(invoice.sentAt)} />
              {invoice.lastError ? (
                <DetailRow label="Invoice error" value={invoice.lastError} />
              ) : null}
            </>
          ) : null}
          {detail.logs.length > 0 ? (
            <Field>
              <FieldLabel>History</FieldLabel>
              <ul className="space-y-1 rounded-md border border-border bg-muted/40 p-3 text-xs">
                {detail.logs.map((entry) => (
                  <li key={entry.id} className="flex justify-between gap-3">
                    <span className="font-mono">{entry.event}</span>
                    <span className="text-muted-foreground">{formatWhen(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Field>
          ) : null}
        </div>
      )}
    </Dialog>
  )
}
