import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const listActivityQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  actionPrefix: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(80).optional(),
  since: z.string().datetime().optional(),
})

export const listLogsQuerySchema = paginationQuerySchema

export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>
export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>
