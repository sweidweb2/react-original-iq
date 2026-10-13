import { describe, expect, it } from 'vitest'

import { contactMessageSchema, newsletterSchema } from '@/features/public/contact/contact.schema'
import { parseForm } from '@/lib/form'

describe('contactMessageSchema', () => {
  it('requires a name, email, and message', () => {
    const result = parseForm(contactMessageSchema, {
      name: '',
      email: 'not-an-email',
      subject: '',
      message: '',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.fieldErrors.name).toBeTruthy()
    expect(result.fieldErrors.email).toBeTruthy()
    expect(result.fieldErrors.message).toBeTruthy()
  })

  it('accepts a valid message and drops a blank subject', () => {
    const result = parseForm(contactMessageSchema, {
      name: ' Ada ',
      email: ' Ada@Example.com ',
      subject: '   ',
      message: ' Hello ',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello',
    })
    expect(result.data.subject).toBeUndefined()
  })
})

describe('newsletterSchema', () => {
  it('requires a valid email', () => {
    const result = parseForm(newsletterSchema, { email: 'ada@example.com' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.email).toBe('ada@example.com')
  })
})
