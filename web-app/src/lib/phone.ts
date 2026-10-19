import { z } from 'zod'

const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]*$/

export function isPhone(value: string): boolean {
  return value.length >= 8 && value.length <= 20 && PHONE_PATTERN.test(value)
}

const phoneMessage = 'Enter a phone number of 8 to 20 characters (digits, spaces, + ( ) -)'

export const requiredPhoneField = z.string().trim().refine(isPhone, phoneMessage)

/** Empty is allowed. Anything typed must be a valid phone. */
export const optionalPhoneField = z
  .string()
  .trim()
  .max(20, 'Use at most 20 characters')
  .refine((value) => value.length === 0 || isPhone(value), phoneMessage)
