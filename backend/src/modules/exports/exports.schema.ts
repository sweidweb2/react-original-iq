import { z } from 'zod'

export const EXPORT_RESOURCES = [
  'users',
  'tasks',
  'files',
  'solutions',
  'revision-sessions',
  'revision-session-solutions',
  'payments',
  'payment-logs',
  'refunds',
  'feedback',
  'specializations',
  'leads',
  'login-attempts',
  'login-verifications',
] as const

export const exportResourceParamsSchema = z.object({
  resource: z.enum(EXPORT_RESOURCES),
})

export type ExportResource = (typeof EXPORT_RESOURCES)[number]
export type ExportResourceParams = z.infer<typeof exportResourceParamsSchema>
