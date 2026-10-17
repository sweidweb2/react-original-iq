import { describe, expect, it } from 'vitest'

import {
  editPermissionFormSchema,
  editRoleFormSchema,
  permissionFormSchema,
  roleFormSchema,
} from '@/features/super/rbac/rbac.schema'

describe('roleFormSchema', () => {
  const valid = { key: 'support_lead', name: 'Support lead', sortOrder: '10' }

  it('accepts a snake_case key and coerces sortOrder', () => {
    expect(roleFormSchema.parse(valid)).toMatchObject({ key: 'support_lead', sortOrder: 10 })
  })

  it.each(['SupportLead', 'support-lead', '1support', 'x'])('rejects key %s', (key) => {
    expect(roleFormSchema.safeParse({ ...valid, key }).success).toBe(false)
  })

  it('caps role keys at 64 characters', () => {
    expect(roleFormSchema.safeParse({ ...valid, key: `r${'a'.repeat(63)}` }).success).toBe(true)
    expect(roleFormSchema.safeParse({ ...valid, key: `r${'a'.repeat(64)}` }).success).toBe(false)
  })

  it('rejects negative or fractional sort orders', () => {
    expect(roleFormSchema.safeParse({ ...valid, sortOrder: -1 }).success).toBe(false)
    expect(roleFormSchema.safeParse({ ...valid, sortOrder: 1.5 }).success).toBe(false)
  })

  it('does not let edits change the key', () => {
    const parsed = editRoleFormSchema.parse({ ...valid, key: 'renamed' })
    expect(parsed).not.toHaveProperty('key')
  })
})

describe('permissionFormSchema', () => {
  const valid = { key: 'tasks_approve', name: 'Approve tasks', category: 'tasks' }

  it('accepts keys up to 80 characters', () => {
    expect(permissionFormSchema.safeParse(valid).success).toBe(true)
    expect(permissionFormSchema.safeParse({ ...valid, key: `p${'a'.repeat(79)}` }).success).toBe(
      true,
    )
    expect(permissionFormSchema.safeParse({ ...valid, key: `p${'a'.repeat(80)}` }).success).toBe(
      false,
    )
  })

  it('requires a category', () => {
    const result = editPermissionFormSchema.safeParse({ ...valid, category: '  ' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Category is required')
  })
})
