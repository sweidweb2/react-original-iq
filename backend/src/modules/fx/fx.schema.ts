import { z } from 'zod'

import { SUPPORTED_CURRENCIES } from './fx.types.js'

const currencyCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.enum(SUPPORTED_CURRENCIES))

export const ratesQuerySchema = z.object({
  base: currencyCodeSchema.default('USD'),
})

export const convertQuerySchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000_000),
  from: currencyCodeSchema.default('USD'),
  to: currencyCodeSchema,
})

export type RatesQuery = z.infer<typeof ratesQuerySchema>
export type ConvertQuery = z.infer<typeof convertQuerySchema>
