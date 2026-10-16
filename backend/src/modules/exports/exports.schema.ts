import { z } from 'zod'

export const exportResourceParamsSchema = z.object({
  resource: z.enum(['users', 'tasks', 'payments', 'refunds', 'leads', 'feedback']),
})

export type ExportResourceParams = z.infer<typeof exportResourceParamsSchema>
