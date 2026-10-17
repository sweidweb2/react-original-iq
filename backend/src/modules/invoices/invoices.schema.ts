import { z } from 'zod'

export const invoiceIdParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

export type InvoiceIdParams = z.infer<typeof invoiceIdParamsSchema>
