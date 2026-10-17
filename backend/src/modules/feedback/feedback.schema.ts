import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

/** The tutor is taken from the task, never from the client. */
export const createFeedbackBodySchema = z.object({
  taskId: z.string().trim().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comments: z.string().trim().max(2000).optional(),
  suggestions: z.string().trim().max(2000).optional(),
})

export const listFeedbackQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
})

export const feedbackIdParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

export type CreateFeedbackBody = z.infer<typeof createFeedbackBodySchema>
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>
