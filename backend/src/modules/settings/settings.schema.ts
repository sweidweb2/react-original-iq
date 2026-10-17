import { z } from 'zod'

export const updateSettingsBodySchema = z
  .object({
    maintenanceMode: z.boolean().optional(),
    emailsSend: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' })

export type UpdateSettingsBody = z.infer<typeof updateSettingsBodySchema>
