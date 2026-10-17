import { z } from 'zod'

import { UPLOAD_SIZE_CEILING_BYTES } from '../../storage/constants.js'
import { paginationQuerySchema } from '../_shared/pagination.schema.js'

const taskTypeSchema = z.enum(['assignment', 'tutoring', 'research', 'editing'])
const taskStatusSchema = z.enum([
  'pending',
  'in-progress',
  'waiting_coordinator_approval',
  'completed',
  'cancelled',
])
export const taskIdParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

/** `?ids=a,b,c` selects specific files for the zip; omitted means all. */
export const zipQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ? [
            ...new Set(
              value
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean),
            ),
          ]
        : undefined,
    )
    .pipe(z.array(z.string().uuid()).max(200).optional()),
})

export const taskFileParamsSchema = taskIdParamsSchema.extend({
  fileId: z.string().trim().uuid(),
})

export const taskSolutionParamsSchema = taskIdParamsSchema.extend({
  solutionId: z.string().trim().uuid(),
})

export const listTasksQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: taskStatusSchema.optional(),
})

const futureDeadline = z
  .string()
  .datetime({ offset: true })
  .refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'Deadline must be in the future',
  })

export const createTaskBodySchema = z.object({
  clientId: z.string().uuid().optional(),
  tutorId: z.string().uuid().nullable().optional(),
  topic: z.string().trim().min(1).max(255),
  type: taskTypeSchema,
  category: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(10000),
  deadline: futureDeadline,
  price: z.coerce.number().min(0).max(999999.99).optional(),
})

/**
 * Content fields only. Status, tutor, and price change through their dedicated
 * endpoints so lifecycle rules and payment recompute always run.
 */
export const updateTaskBodySchema = z
  .object({
    topic: z.string().trim().min(1).max(255).optional(),
    type: taskTypeSchema.optional(),
    category: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(10000).optional(),
    deadline: futureDeadline.optional(),
    feedback: z.string().trim().max(5000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const updatePriceBodySchema = z.object({
  price: z.coerce.number().min(0).max(999999.99),
})

export const assignTutorBodySchema = z.object({
  tutorId: z.string().uuid(),
})

export const changeCoordinatorBodySchema = z.object({
  coordinatorId: z.string().uuid(),
})

export const allowViewBodySchema = z.object({
  allowView: z.boolean(),
})

export const uploadUrlBodySchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(120),
  sizeBytes: z.coerce.number().int().positive().max(UPLOAD_SIZE_CEILING_BYTES),
})

const uploadedObjectSchema = z.object({
  key: z.string().trim().min(1).max(1024),
  filename: z.string().trim().min(1).max(255),
})

export const addFileBodySchema = uploadedObjectSchema.extend({
  note: z.string().trim().max(500).optional(),
})

export const addSolutionBodySchema = uploadedObjectSchema

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>
export type AddFileBody = z.infer<typeof addFileBodySchema>
export type AddSolutionBody = z.infer<typeof addSolutionBodySchema>
export type UploadUrlBody = z.infer<typeof uploadUrlBodySchema>
export type AllowViewBody = z.infer<typeof allowViewBodySchema>
export type AssignTutorBody = z.infer<typeof assignTutorBodySchema>
export type ChangeCoordinatorBody = z.infer<typeof changeCoordinatorBodySchema>
export type UpdatePriceBody = z.infer<typeof updatePriceBodySchema>
export type ZipQuery = z.infer<typeof zipQuerySchema>
