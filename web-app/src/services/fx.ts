import { apiRequest } from './api'

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

export type FxRates = {
  base: SupportedCurrency
  rates: Partial<Record<SupportedCurrency, number>>
  fetchedAt: string | null
  fallback: boolean
}

export function getFxRates(base: SupportedCurrency = 'USD') {
  return apiRequest<FxRates>(`/fx/rates?base=${encodeURIComponent(base)}`)
}

export function convertAmount(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100
}

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
}
