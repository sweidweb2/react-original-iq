import { z } from 'zod'

export const specializationIdParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

export const listSpecializationsQuerySchema = z.object({
  tutorId: z.string().trim().uuid(),
})

export const createSpecializationBodySchema = z.object({
  tutorId: z.string().trim().uuid(),
  name: z.string().trim().min(1).max(120),
  note: z.string().trim().max(2000).optional(),
})

export type ListSpecializationsQuery = z.infer<typeof listSpecializationsQuerySchema>
export type CreateSpecializationBody = z.infer<typeof createSpecializationBodySchema>
