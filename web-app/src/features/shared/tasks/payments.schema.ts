import { z } from 'zod'

const amountField = z
  .string()
  .trim()
  .min(1, 'Amount is required')
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), 'Use a number with up to 2 decimals')
  .transform(Number)
  .refine((value) => value >= 0.01, 'Amount must be at least 0.01')

function expiryInFuture(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}

function amountWithinDue(due: number) {
  return amountField.refine((value) => value <= due + 0.005, {
    message: `Amount cannot exceed the balance due (${due.toFixed(2)})`,
  })
}

/** Amount only. Used when checkout redirects to MontyPay (no card data on this site). */
export function checkoutAmountSchema(due: number) {
  return z.object({
    amount: amountWithinDue(due),
  })
}

/** Card fields are UX-only in simulated mode; they are never sent to the API. */
export function checkoutSchema(due: number) {
  return z.object({
    amount: amountWithinDue(due),
    cardholder: z.string().trim().min(2, 'Cardholder name is required').max(120),
    cardNumber: z
      .string()
      .transform((value) => value.replace(/\s+/g, ''))
      .refine((value) => /^\d{13,19}$/.test(value), 'Enter a valid card number'),
    expiry: z.string().trim().refine(expiryInFuture, 'Use MM/YY in the future'),
    cvc: z
      .string()
      .trim()
      .refine((value) => /^\d{3,4}$/.test(value), 'CVC must be 3 or 4 digits'),
  })
}

export const paymentFormSchema = z.object({
  amount: amountField,
  status: z.enum(['pending', 'paid', 'failed', 'canceled', 'refunded']),
  paymentMethod: z.string().trim().max(64),
})

export type PaymentFormValues = z.infer<typeof paymentFormSchema>
