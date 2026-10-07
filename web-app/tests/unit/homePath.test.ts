import { describe, expect, it } from 'vitest'

import { homePathForRole } from '@/lib/homePath'

describe('homePathForRole', () => {
  it('maps each role to its portal', () => {
    expect(homePathForRole('admin')).toBe('/admin')
    expect(homePathForRole('coordinator')).toBe('/coordinator')
    expect(homePathForRole('tutor')).toBe('/tutor')
    expect(homePathForRole('client')).toBe('/client')
  })
})
