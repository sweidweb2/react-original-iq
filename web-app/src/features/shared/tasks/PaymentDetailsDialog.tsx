import { useEffect, useState } from 'react'

import { AsyncState, InlineSpinner } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getPayment, type PaymentDetail } from '@/services/payments'

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
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open || !paymentId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setDetail(null)
    getPayment(taskId, paymentId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, taskId, paymentId, reloadKey])

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
      <AsyncState
        isLoading={isLoading || (!detail && !error)}
        error={error}
        onRetry={() => setReloadKey((k) => k + 1)}
        loadingFallback={<InlineSpinner label="Loading payment…" />}
      >
        {detail ? (
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
            {detail.voidedInvoices.length > 0 ? (
              <Field>
                <FieldLabel>Voided invoices</FieldLabel>
                <ul className="space-y-1 rounded-md border border-border bg-muted/40 p-3 text-xs">
                  {detail.voidedInvoices.map((voided) => (
                    <li key={voided.id} className="space-y-0.5">
                      <div className="flex justify-between gap-3">
                        <span className="font-mono">
                          {voided.invoiceNumber} · {voided.amount.toFixed(2)} {voided.currency}
                        </span>
                        <span className="text-muted-foreground">{formatWhen(voided.voidedAt)}</span>
                      </div>
                      {voided.voidReason ? (
                        <p className="text-muted-foreground">{voided.voidReason}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Field>
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
        ) : null}
      </AsyncState>
    </Dialog>
  )
}
