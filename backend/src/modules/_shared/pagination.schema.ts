import { z } from 'zod'

/** Shared list pagination query (page/limit). Coerces string query values. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
