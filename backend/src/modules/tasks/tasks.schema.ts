import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

const taskTypeSchema = z.enum(['assignment', 'tutoring', 'research', 'editing'])
const taskStatusSchema = z.enum([
  'pending',
  'in-progress',
  'waiting_coordinator_approval',
  'completed',
  'cancelled',
])
const taskPaymentStatusSchema = z.enum(['unpaid', 'paid', 'refund_pending'])

export const taskIdParamsSchema = z.object({
  id: z.string().trim().uuid(),
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
  status: taskStatusSchema.optional(),
})

export const updateTaskBodySchema = z
  .object({
    topic: z.string().trim().min(1).max(255).optional(),
    type: taskTypeSchema.optional(),
    category: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(10000).optional(),
    deadline: futureDeadline.optional(),
    status: taskStatusSchema.optional(),
    tutorId: z.string().uuid().nullable().optional(),
    price: z.coerce.number().min(0).max(999999.99).optional(),
    paymentStatus: taskPaymentStatusSchema.optional(),
    feedback: z.string().trim().max(5000).optional(),
  })
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

export const addFileBodySchema = z.object({
  fileLocation: z.string().trim().min(1).max(2048),
  note: z.string().trim().max(500).optional(),
})

export const addSolutionBodySchema = z.object({
  fileLocation: z.string().trim().min(1).max(2048),
})

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>
export type AddFileBody = z.infer<typeof addFileBodySchema>
export type AddSolutionBody = z.infer<typeof addSolutionBodySchema>
export type AllowViewBody = z.infer<typeof allowViewBodySchema>
export type AssignTutorBody = z.infer<typeof assignTutorBodySchema>
export type ChangeCoordinatorBody = z.infer<typeof changeCoordinatorBodySchema>
export type UpdatePriceBody = z.infer<typeof updatePriceBodySchema>
