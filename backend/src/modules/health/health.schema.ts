import { z } from 'zod'

export const healthResponseSchema = z.object({
  ok: z.literal(true),
})

export const healthDbResponseSchema = z.object({
  ok: z.literal(true),
  db: z.literal(true),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>
export type HealthDbResponse = z.infer<typeof healthDbResponseSchema>
