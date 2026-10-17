import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'
import { ERROR_LEVELS } from './logging.types.js'

export const listActivityQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  actionPrefix: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(80).optional(),
  since: z.string().datetime().optional(),
})

export const listErrorsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  /** Source prefix: `invoices` matches `invoices.email`, `invoices.issue`, … */
  source: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-zA-Z0-9_.-]+$/)
    .optional(),
  level: z.enum(ERROR_LEVELS).optional(),
  since: z.string().datetime().optional(),
})

export const errorLogIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const deleteErrorLogsBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
})

export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>
export type ListErrorsQuery = z.infer<typeof listErrorsQuerySchema>
export type DeleteErrorLogsBody = z.infer<typeof deleteErrorLogsBodySchema>
