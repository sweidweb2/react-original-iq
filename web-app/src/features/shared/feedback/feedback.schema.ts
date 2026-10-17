import { z } from 'zod'

export const feedbackFormSchema = z.object({
  taskId: z.string().trim().min(1, 'Pick one of your completed tasks'),
  rating: z
    .number()
    .int()
    .min(1, 'Pick a rating between 1 and 5 stars')
    .max(5, 'Pick a rating between 1 and 5 stars'),
  comments: z.string().trim().max(2000, 'Keep comments under 2000 characters'),
  suggestions: z.string().trim().max(2000, 'Keep suggestions under 2000 characters'),
})

export type FeedbackFormValues = z.infer<typeof feedbackFormSchema>
