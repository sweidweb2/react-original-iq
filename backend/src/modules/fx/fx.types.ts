export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'SAR',
  'AED',
  'KWD',
  'QAR',
  'BHD',
  'OMR',
  'JOD',
  'EGP',
  'IQD',
] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

/** USD-based table as returned by the upstream provider. */
export type UsdRatesSnapshot = {
  rates: Record<string, number>
  fetchedAt: string
}

export type FxRates = {
  base: SupportedCurrency
  rates: Partial<Record<SupportedCurrency, number>>
  fetchedAt: string | null
  fallback: boolean
}

export type FxConversion = {
  amount: number
  from: SupportedCurrency
  to: SupportedCurrency
  rate: number
  converted: number
  fetchedAt: string | null
  fallback: boolean
}
