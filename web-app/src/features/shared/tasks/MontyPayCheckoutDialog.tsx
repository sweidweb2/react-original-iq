import { type FormEvent, useEffect, useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { type FieldErrors, parseForm } from '@/lib/form'
import { checkoutTaskPayment, isCheckoutRedirect } from '@/services/payments'
import { toastApiError, toastSuccess } from '@/services/toast'

import { checkoutAmountSchema } from './payments.schema'

type MontyPayCheckoutDialogProps = {
  open: boolean
  taskId: string
  due: number
  onClose: () => void
  onPaid: () => void
}

export function MontyPayCheckoutDialog({
  open,
  taskId,
  due,
  onClose,
  onPaid,
}: MontyPayCheckoutDialogProps) {
  const [amount, setAmount] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    setAmount(due.toFixed(2))
  }, [open, due])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(checkoutAmountSchema(due), { amount })
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const result = await checkoutTaskPayment(taskId, { amount: parsed.data.amount })
      if (isCheckoutRedirect(result)) {
        window.location.assign(result.redirectUrl)
        return
      }
      const invoiceNote = result.invoice
        ? ` Invoice ${result.invoice.invoiceNumber} ${result.invoice.invoiceStatus === 'sent' ? 'was emailed to you' : 'will be emailed to you shortly'}.`
        : ''
      toastSuccess('Payment completed', `$${result.amount.toFixed(2)} paid.${invoiceNote}`)
      onPaid()
      onClose()
    } catch (error) {
      toastApiError(error, `Your $${parsed.data.amount.toFixed(2)} payment didn't go through`)
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      title="Pay for this task"
      description="You will continue on the secure card page. Nothing is charged until that payment succeeds."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="montypay-checkout-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <CreditCard className="size-4" aria-hidden />
            )}
            Continue to pay ${Number(amount || 0).toFixed(2)}
          </Button>
        </>
      }
    >
      <Form id="montypay-checkout-form" onSubmit={onSubmit} noValidate className="grid gap-3">
        <Field data-invalid={Boolean(fieldErrors.amount) || undefined}>
          <FieldLabel htmlFor="montypay-amount">Amount (USD)</FieldLabel>
          <Input
            id="montypay-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Balance due: ${due.toFixed(2)}</p>
          <FieldError>{fieldErrors.amount}</FieldError>
        </Field>
      </Form>
    </Dialog>
  )
}
