import { describe, expect, it } from 'vitest'

import {
  contactMessageBodySchema,
  exportContactQuerySchema,
  updateLeadBodySchema,
  updateMessageBodySchema,
  updateNewsletterBodySchema,
} from '../../src/modules/contact/contact.schema.js'

describe('contact public message schema', () => {
  const base = { email: 'ada@example.com' }

  it('accepts names and messages longer than the old 20/245 limits', () => {
    const parsed = contactMessageBodySchema.parse({
      ...base,
      name: 'A'.repeat(120),
      message: 'm'.repeat(5000),
    })
    expect(parsed.name).toHaveLength(120)
    expect(parsed.message).toHaveLength(5000)
  })

  it('rejects names over the varchar(120) column', () => {
    expect(() =>
      contactMessageBodySchema.parse({ ...base, name: 'A'.repeat(121), message: 'hi' }),
    ).toThrow()
  })
})

describe('contact export query schema', () => {
  it('trims search and drops blanks', () => {
    expect(exportContactQuerySchema.parse({ search: '  ada ' })).toEqual({ search: 'ada' })
    expect(exportContactQuerySchema.parse({ search: '   ' })).toEqual({ search: undefined })
    expect(exportContactQuerySchema.parse({})).toEqual({ search: undefined })
  })

  it('rejects oversized or non-string search', () => {
    expect(() => exportContactQuerySchema.parse({ search: 'x'.repeat(121) })).toThrow()
    expect(() => exportContactQuerySchema.parse({ search: ['a', 'b'] })).toThrow()
  })
})

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
