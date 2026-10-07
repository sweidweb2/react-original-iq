import { describe, expect, it } from 'vitest'

import { homePathForRole } from '@/lib/homePath'

describe('homePathForRole', () => {
  it('maps staff roles to panels and students to home', () => {
    expect(homePathForRole('SUPER')).toBe('/super')
    expect(homePathForRole('ADMIN')).toBe('/admin')
    expect(homePathForRole('TUTOR')).toBe('/tutor')
    expect(homePathForRole('STUDENT')).toBe('/')
  })
})
