import { z } from 'zod'

export const createTaskFormSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(255),
  type: z.enum(['assignment', 'tutoring', 'research', 'editing']),
  category: z.string().trim().min(1, 'Category is required').max(120),
  description: z.string().trim().min(1, 'Description is required').max(10000),
  deadline: z.string().trim().min(1, 'Deadline is required'),
  clientId: z.string().uuid().optional(),
})

export type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>
