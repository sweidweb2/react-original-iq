import { z } from 'zod'

const revisionStatusSchema = z.enum([
  'in-revision',
  'waiting_coordinator_approval',
  'completed',
  'cancelled',
])

/** Nested under `/tasks/:id/revisions` (mergeParams → `id`). */
export const taskRevisionsParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

export const revisionIdParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

export const createRevisionBodySchema = z.object({
  title: z.string().trim().max(255).optional(),
  description: z.string().trim().max(10000).optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  deadline: z.string().datetime({ offset: true }).optional(),
})

export const updateRevisionBodySchema = z
  .object({
    title: z.string().trim().max(255).optional(),
    description: z.string().trim().max(10000).optional(),
    startDate: z.string().datetime({ offset: true }).nullable().optional(),
    deadline: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const tutorSubmitRevisionBodySchema = z.object({
  solutionIds: z.array(z.string().uuid()).optional(),
})

export type CreateRevisionBody = z.infer<typeof createRevisionBodySchema>
export type UpdateRevisionBody = z.infer<typeof updateRevisionBodySchema>
export type TutorSubmitRevisionBody = z.infer<typeof tutorSubmitRevisionBodySchema>
export { revisionStatusSchema }
