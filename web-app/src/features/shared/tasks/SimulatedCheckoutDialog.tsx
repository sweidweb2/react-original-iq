import { type FormEvent, useEffect, useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { type FieldErrors, parseForm } from '@/lib/form'
import { checkoutTaskPayment } from '@/services/payments'
import { toastApiError, toastSuccess } from '@/services/toast'

import { checkoutSchema } from './payments.schema'

type CheckoutValues = {
  amount: string
  cardholder: string
  cardNumber: string
  expiry: string
  cvc: string
}

type SimulatedCheckoutDialogProps = {
  open: boolean
  taskId: string
  due: number
  onClose: () => void
  onPaid: () => void
}

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export function SimulatedCheckoutDialog({
  open,
  taskId,
  due,
  onClose,
  onPaid,
}: SimulatedCheckoutDialogProps) {
  const [values, setValues] = useState<CheckoutValues>({
    amount: '',
    cardholder: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    setValues({ amount: due.toFixed(2), cardholder: '', cardNumber: '', expiry: '', cvc: '' })
  }, [open, due])

  function set<K extends keyof CheckoutValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(checkoutSchema(due), values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const payment = await checkoutTaskPayment(taskId, { amount: parsed.data.amount })
      const invoiceNote = payment.invoice
        ? ` Invoice ${payment.invoice.invoiceNumber} ${payment.invoice.invoiceStatus === 'sent' ? 'was emailed to you' : 'will be emailed to you shortly'}.`
        : ''
      toastSuccess('Payment completed', `$${payment.amount.toFixed(2)} paid.${invoiceNote}`)
      onPaid()
      onClose()
    } catch (error) {
      toastApiError(error, `Your $${parsed.data.amount.toFixed(2)} payment didn't go through`)
    } finally {
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
      description="Test mode: no real card is charged. Any valid-looking card works (e.g. 4242 4242 4242 4242)."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="simulated-checkout-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <CreditCard className="size-4" aria-hidden />
            )}
            Pay ${Number(values.amount || 0).toFixed(2)}
          </Button>
        </>
      }
    >
      <Form id="simulated-checkout-form" onSubmit={onSubmit} noValidate className="grid gap-3">
        <Field data-invalid={Boolean(fieldErrors.amount) || undefined}>
          <FieldLabel htmlFor="checkout-amount">Amount (USD)</FieldLabel>
          <Input
            id="checkout-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={values.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Balance due: ${due.toFixed(2)}</p>
          <FieldError>{fieldErrors.amount}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors.cardholder) || undefined}>
          <FieldLabel htmlFor="checkout-cardholder">Cardholder name</FieldLabel>
          <Input
            id="checkout-cardholder"
            autoComplete="cc-name"
            placeholder="Name on card"
            value={values.cardholder}
            onChange={(e) => set('cardholder', e.target.value)}
          />
          <FieldError>{fieldErrors.cardholder}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors.cardNumber) || undefined}>
          <FieldLabel htmlFor="checkout-card">Card number</FieldLabel>
          <Input
            id="checkout-card"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            value={values.cardNumber}
            onChange={(e) => set('cardNumber', formatCardNumber(e.target.value))}
          />
          <FieldError>{fieldErrors.cardNumber}</FieldError>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(fieldErrors.expiry) || undefined}>
            <FieldLabel htmlFor="checkout-expiry">Expiry</FieldLabel>
            <Input
              id="checkout-expiry"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              value={values.expiry}
              onChange={(e) => set('expiry', formatExpiry(e.target.value))}
            />
            <FieldError>{fieldErrors.expiry}</FieldError>
          </Field>
          <Field data-invalid={Boolean(fieldErrors.cvc) || undefined}>
            <FieldLabel htmlFor="checkout-cvc">CVC</FieldLabel>
            <Input
              id="checkout-cvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              value={values.cvc}
              onChange={(e) => set('cvc', e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <FieldError>{fieldErrors.cvc}</FieldError>
          </Field>
        </div>
      </Form>
    </Dialog>
  )
}
