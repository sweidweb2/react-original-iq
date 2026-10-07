import { describe, expect, it } from 'vitest'

import {
  assertOwner,
  assertOwnerOrAdmin,
  assertSelfOrAdmin,
  hasAnyRole,
  isAdmin,
  isStaff,
} from '../../src/authz/index.js'
import { AppError } from '../../src/errors/app-error.js'

describe('authz roles', () => {
  it('detects admin and staff', () => {
    expect(isAdmin(['admin'])).toBe(true)
    expect(isAdmin(['coordinator'])).toBe(false)
    expect(isAdmin(['client'])).toBe(false)
    expect(isStaff(['tutor'])).toBe(true)
    expect(isStaff(['coordinator'])).toBe(true)
    expect(isStaff(['client'])).toBe(false)
  })

  it('hasAnyRole matches allowed set', () => {
    expect(hasAnyRole(['tutor'], ['admin', 'tutor'])).toBe(true)
    expect(hasAnyRole(['client'], ['admin'])).toBe(false)
    expect(hasAnyRole(undefined, ['admin'])).toBe(false)
  })
})

describe('authz ownership', () => {
  it('assertOwner allows matching ids', () => {
    expect(() => assertOwner('u1', 'u1')).not.toThrow()
  })

  it('assertOwner forbids mismatched ids', () => {
    try {
      assertOwner('u1', 'u2')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).status).toBe(403)
    }
  })

  it('assertOwnerOrAdmin lets admin bypass ownership', () => {
    expect(() =>
      assertOwnerOrAdmin({ id: 'admin-1', roles: ['admin'] }, 'other-owner'),
    ).not.toThrow()
  })

  it('assertOwnerOrAdmin still requires ownership for non-admins', () => {
    expect(() => assertOwnerOrAdmin({ id: 'u1', roles: ['client'] }, 'u1')).not.toThrow()
    try {
      assertOwnerOrAdmin({ id: 'u1', roles: ['client'] }, 'u2')
      expect.unreachable()
    } catch (error) {
      expect((error as AppError).status).toBe(403)
    }
  })

  it('assertSelfOrAdmin follows the same admin bypass', () => {
    expect(() => assertSelfOrAdmin({ id: 'u1', roles: ['client'] }, 'u1')).not.toThrow()
    expect(() => assertSelfOrAdmin({ id: 'a1', roles: ['admin'] }, 'u9')).not.toThrow()
  })
})
