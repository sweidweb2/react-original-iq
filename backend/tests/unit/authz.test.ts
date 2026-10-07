import { describe, expect, it } from 'vitest'

import {
  assertOwner,
  assertOwnerOrAdmin,
  assertSelfOrAdmin,
  hasAnyRole,
  isAdmin,
  isStaff,
  isSuper,
} from '../../src/authz/index.js'
import { AppError } from '../../src/errors/app-error.js'

describe('authz roles', () => {
  it('detects admin and super', () => {
    expect(isAdmin(['ADMIN'])).toBe(true)
    expect(isAdmin(['SUPER'])).toBe(true)
    expect(isAdmin(['STUDENT'])).toBe(false)
    expect(isSuper(['SUPER'])).toBe(true)
    expect(isSuper(['ADMIN'])).toBe(false)
    expect(isStaff(['TUTOR'])).toBe(true)
    expect(isStaff(['STUDENT'])).toBe(false)
  })

  it('hasAnyRole matches allowed set', () => {
    expect(hasAnyRole(['TUTOR'], ['ADMIN', 'TUTOR'])).toBe(true)
    expect(hasAnyRole(['STUDENT'], ['ADMIN'])).toBe(false)
    expect(hasAnyRole(undefined, ['ADMIN'])).toBe(false)
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
      assertOwnerOrAdmin({ id: 'admin-1', roles: ['ADMIN'] }, 'other-owner'),
    ).not.toThrow()
    expect(() =>
      assertOwnerOrAdmin({ id: 'super-1', roles: ['SUPER'] }, 'other-owner'),
    ).not.toThrow()
  })

  it('assertOwnerOrAdmin still requires ownership for non-admins', () => {
    expect(() =>
      assertOwnerOrAdmin({ id: 'u1', roles: ['STUDENT'] }, 'u1'),
    ).not.toThrow()
    try {
      assertOwnerOrAdmin({ id: 'u1', roles: ['STUDENT'] }, 'u2')
      expect.unreachable()
    } catch (error) {
      expect((error as AppError).status).toBe(403)
    }
  })

  it('assertSelfOrAdmin follows the same admin bypass', () => {
    expect(() =>
      assertSelfOrAdmin({ id: 'u1', roles: ['STUDENT'] }, 'u1'),
    ).not.toThrow()
    expect(() =>
      assertSelfOrAdmin({ id: 'a1', roles: ['ADMIN'] }, 'u9'),
    ).not.toThrow()
  })
})
