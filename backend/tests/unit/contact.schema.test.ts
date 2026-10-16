import { describe, expect, it } from 'vitest'

import {
  updateLeadBodySchema,
  updateMessageBodySchema,
  updateNewsletterBodySchema,
} from '../../src/modules/contact/contact.schema.js'

describe('contact admin update schemas', () => {
  it('accepts a partial lead patch', () => {
    expect(updateLeadBodySchema.parse({ country: 'Lebanon' })).toEqual({ country: 'Lebanon' })
    expect(updateLeadBodySchema.parse({ email: 'Ada@Example.com' })).toEqual({
      email: 'ada@example.com',
    })
  })

  it('rejects an empty lead patch', () => {
    expect(() => updateLeadBodySchema.parse({})).toThrow()
  })

  it('accepts a message patch and rejects empty', () => {
    expect(updateMessageBodySchema.parse({ message: 'Updated body' })).toEqual({
      message: 'Updated body',
    })
    expect(() => updateMessageBodySchema.parse({})).toThrow()
  })

  it('normalizes newsletter email', () => {
    expect(updateNewsletterBodySchema.parse({ email: 'News@Example.com' })).toEqual({
      email: 'news@example.com',
    })
  })
})
