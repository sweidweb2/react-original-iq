import { z } from 'zod'

/** Digits with an optional leading +, plus spaces and ()-. Stored limit matches a short international number. */
const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]*$/

export function isPhone(value: string): boolean {
  return value.length >= 8 && value.length <= 20 && PHONE_PATTERN.test(value)
}

export const requiredPhoneSchema = z
  .string()
  .trim()
  .refine(isPhone, 'Enter a phone number of 8 to 20 characters')
