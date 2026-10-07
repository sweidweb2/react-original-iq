import type { z } from 'zod'

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>

export type FormParseSuccess<T> = {
  success: true
  data: T
}

export type FormParseFailure<TField extends string = string> = {
  success: false
  fieldErrors: FieldErrors<TField>
  formError?: string
}

export type FormParseResult<T, TField extends string = string> =
  FormParseSuccess<T> | FormParseFailure<TField>

/**
 * UX-only form validation. Backend Zod remains the security boundary.
 */
export function parseForm<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): FormParseResult<z.infer<TSchema>> {
  const result = schema.safeParse(input)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const flattened = result.error.flatten()
  const fieldErrors: FieldErrors = {}

  for (const [key, messages] of Object.entries(flattened.fieldErrors)) {
    const list = messages as string[] | undefined
    const message = list?.[0]
    if (message) {
      fieldErrors[key] = message
    }
  }

  return {
    success: false,
    fieldErrors,
    formError: flattened.formErrors[0],
  }
}
