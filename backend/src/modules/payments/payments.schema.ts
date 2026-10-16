import { z } from 'zod'

const paymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'canceled', 'refunded'])

export const taskPaymentsParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

export const taskPaymentParamsSchema = z.object({
  id: z.string().trim().uuid(),
  paymentId: z.string().trim().uuid(),
})

export const createManualPaymentBodySchema = z.object({
  amount: z.coerce.number().positive().max(999999.99),
  status: paymentStatusSchema.optional(),
  paymentMethod: z.string().trim().max(64).optional(),
  currency: z.string().trim().length(3).optional(),
  userId: z.string().uuid().optional(),
})

export const checkoutPaymentBodySchema = z.object({
  amount: z.coerce.number().positive().max(999999.99).optional(),
  currency: z.string().trim().length(3).optional(),
})

export const createRefundBodySchema = z.object({
  amount: z.coerce.number().positive().max(999999.99),
  refundReason: z.string().trim().max(2000).optional(),
  currency: z.string().trim().length(3).optional(),
})

export type CreateManualPaymentBody = z.infer<typeof createManualPaymentBodySchema>
export type CheckoutPaymentBody = z.infer<typeof checkoutPaymentBodySchema>
export type CreateRefundBody = z.infer<typeof createRefundBodySchema>
