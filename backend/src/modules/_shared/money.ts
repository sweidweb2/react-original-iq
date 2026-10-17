/**
 * Money helpers. Arithmetic and comparisons happen on integer minor units (cents, fils, …);
 * amounts cross the API and the DB as decimal major units rounded to the currency's precision.
 */

/** ISO 4217 minor units for currencies that don't use 2 decimals. */
const MINOR_UNITS: Record<string, number> = {
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  JPY: 0,
  KRW: 0,
}

export const DEFAULT_CURRENCY = 'USD'

export function currencyDecimals(currency: string = DEFAULT_CURRENCY): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 2
}

/** Major → integer minor units, rounding half away from zero (`1.005` USD → `101`). */
export function toMinor(amount: number, currency: string = DEFAULT_CURRENCY): number {
  const scaled = Number((Math.abs(amount) * 10 ** currencyDecimals(currency)).toPrecision(15))
  const minor = Math.round(scaled)
  return amount < 0 && minor !== 0 ? -minor : minor
}

export function fromMinor(minor: number, currency: string = DEFAULT_CURRENCY): number {
  return minor / 10 ** currencyDecimals(currency)
}

export function roundMoney(amount: number, currency: string = DEFAULT_CURRENCY): number {
  return fromMinor(toMinor(amount, currency), currency)
}

/** Sum of rounded amounts, in minor units. */
export function sumMinor(amounts: number[], currency: string = DEFAULT_CURRENCY): number {
  return amounts.reduce((total, amount) => total + toMinor(amount, currency), 0)
}

/** `12.5` USD → `"12.50"`, `1.2` KWD → `"1.200"`. */
export function formatAmount(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return roundMoney(amount, currency).toFixed(currencyDecimals(currency))
}
