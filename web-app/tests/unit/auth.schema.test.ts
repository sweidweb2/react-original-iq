import { describe, expect, it } from 'vitest'

import { loginSchema } from '@/features/auth/login.schema'
import { registerSchema } from '@/features/auth/register.schema'
import { parseForm } from '@/lib/form'

describe('registerSchema', () => {
  it('requires a strong enough password', () => {
    const result = parseForm(registerSchema, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.fieldErrors.password).toBeTruthy()
  })

  it('accepts a valid registration payload', () => {
    const result = parseForm(registerSchema, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: ' ada@example.com ',
      password: 'password1',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.email).toBe('ada@example.com')
  })
})

describe('loginSchema', () => {
  it('requires an email and a password', () => {
    const result = parseForm(loginSchema, { email: 'not-an-email', password: '' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.fieldErrors.email).toBeTruthy()
    expect(result.fieldErrors.password).toBeTruthy()
  })

  it('accepts a valid login payload', () => {
    const result = parseForm(loginSchema, {
      email: ' ada@example.com ',
      password: 'password1',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.email).toBe('ada@example.com')
  })
})
