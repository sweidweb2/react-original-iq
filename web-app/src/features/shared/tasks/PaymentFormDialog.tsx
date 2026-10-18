import { type FormEvent, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { type FieldErrors, parseForm } from '@/lib/form'
import {
  createManualPayment,
  PAYMENT_STATUSES,
  type PaymentRecord,
  type PaymentStatus,
  updatePayment,
} from '@/services/payments'
import { toastApiError, toastSuccess } from '@/services/toast'

import { paymentFormSchema } from './payments.schema'

type FormState = {
  amount: string
  status: PaymentStatus
  paymentMethod: string
}

type PaymentFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  taskId: string
  payment: PaymentRecord | null
  due: number
  onClose: () => void
  onSaved: () => void
}

export function PaymentFormDialog({
  open,
  mode,
  taskId,
  payment,
  due,
  onClose,
  onSaved,
}: PaymentFormDialogProps) {
  const [values, setValues] = useState<FormState>({
    amount: '',
    status: 'paid',
    paymentMethod: 'manual',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    if (mode === 'edit' && payment) {
      setValues({
        amount: payment.amount.toFixed(2),
        status: payment.status,
        paymentMethod: payment.paymentMethod ?? '',
      })
      return
    }
    setValues({ amount: due > 0 ? due.toFixed(2) : '', status: 'paid', paymentMethod: 'manual' })
  }, [open, mode, payment, due])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(paymentFormSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        await createManualPayment(taskId, {
          amount: parsed.data.amount,
          status: parsed.data.status,
          paymentMethod: parsed.data.paymentMethod || 'manual',
        })
        toastSuccess(
          'Payment recorded',
          `$${parsed.data.amount.toFixed(2)} marked as ${parsed.data.status}.`,
        )
      } else if (payment) {
        await updatePayment(taskId, payment.id, {
          amount: parsed.data.amount,
          status: parsed.data.status,
          paymentMethod: parsed.data.paymentMethod || null,
        })
        toastSuccess(
          'Payment updated',
          `Now $${parsed.data.amount.toFixed(2)}, ${parsed.data.status}.`,
        )
      }
      onSaved()
      onClose()
    } catch (error) {
      toastApiError(
        error,
        mode === 'create'
          ? `Couldn't record the $${parsed.data.amount.toFixed(2)} payment`
          : "Couldn't save the payment changes",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const willReissue =
    mode === 'edit' &&
    payment?.status === 'paid' &&
    payment.invoice &&
    (values.status !== 'paid' || Number(values.amount) !== payment.amount)

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      title={mode === 'create' ? 'Add payment' : 'Edit payment'}
      description={
        mode === 'create'
          ? `Manual payment (No Gateway). Cannot exceed the balance due ($${due.toFixed(2)}). Paid entries generate an invoice.`
          : 'Changing amount or status of a paid payment voids its invoice and issues a new one.'
      }
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {mode === 'create' ? 'Save' : 'Save changes'}
          </Button>
        </>
      }
    >
      <Form id="payment-form" onSubmit={onSubmit} noValidate className="grid gap-3">
        <Field data-invalid={Boolean(fieldErrors.amount) || undefined}>
          <FieldLabel htmlFor="payment-amount">Amount (USD)</FieldLabel>
          <Input
            id="payment-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={values.amount}
            onChange={(e) => setValues((prev) => ({ ...prev, amount: e.target.value }))}
          />
          <FieldError>{fieldErrors.amount}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors.status) || undefined}>
          <FieldLabel htmlFor="payment-status">Status</FieldLabel>
          <Select
            id="payment-status"
            value={values.status}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, status: e.target.value as PaymentStatus }))
            }
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <FieldError>{fieldErrors.status}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors.paymentMethod) || undefined}>
          <FieldLabel htmlFor="payment-method">Method</FieldLabel>
          <Input
            id="payment-method"
            placeholder="manual, bank transfer, cash…"
            value={values.paymentMethod}
            onChange={(e) => setValues((prev) => ({ ...prev, paymentMethod: e.target.value }))}
          />
          <FieldError>{fieldErrors.paymentMethod}</FieldError>
        </Field>
        {willReissue ? (
          <p className="text-xs text-muted-foreground">
            The current invoice ({payment?.invoice?.invoiceNumber}) will be voided and kept on
            record; a new one is issued if the payment stays paid.
          </p>
        ) : null}
      </Form>
    </Dialog>
  )
}
