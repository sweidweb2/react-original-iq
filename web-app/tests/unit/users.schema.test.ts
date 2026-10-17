import { describe, expect, it } from 'vitest'

import { createUserSchema, editUserSchema } from '@/features/admin/users/users.schema'

function firstIssue(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : result.error?.issues[0]?.message
}

describe('createUserSchema', () => {
  const valid = {
    name: '  Ada Lovelace ',
    email: ' ada@example.com ',
    password: 'password1',
    role: 'tutor',
  }

  it('accepts a complete user and trims name and email', () => {
    const parsed = createUserSchema.parse(valid)
    expect(parsed).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
      role: 'tutor',
    })
  })

  it.each([
    [{ name: '   ' }, 'Name is required'],
    [{ email: '' }, 'Email is required'],
    [{ email: 'not-an-email' }, 'Enter a valid email'],
    [{ password: 'short' }, 'Password must be at least 8 characters'],
  ])('rejects %o', (patch, message) => {
    expect(firstIssue(createUserSchema.safeParse({ ...valid, ...patch }))).toBe(message)
  })

  it('rejects roles outside the fixed set', () => {
    expect(createUserSchema.safeParse({ ...valid, role: 'owner' }).success).toBe(false)
  })
})

describe('editUserSchema', () => {
  const valid = { name: 'Ada', role: 'client', status: 'ACTIVE', password: '' }

  it('treats an empty password as "keep the current one"', () => {
    expect(editUserSchema.safeParse(valid).success).toBe(true)
  })

  it('requires a new password to be at least 8 characters', () => {
    expect(firstIssue(editUserSchema.safeParse({ ...valid, password: 'abc' }))).toBe(
      'Password must be at least 8 characters',
    )
    expect(editUserSchema.safeParse({ ...valid, password: 'longenough' }).success).toBe(true)
  })

  it('only allows ACTIVE or INACTIVE status', () => {
    expect(editUserSchema.safeParse({ ...valid, status: 'INACTIVE' }).success).toBe(true)
    expect(editUserSchema.safeParse({ ...valid, status: 'BANNED' }).success).toBe(false)
  })
})
