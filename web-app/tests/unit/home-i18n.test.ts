import { describe, expect, it } from 'vitest'

import { countries } from '@/features/home/countries'
import { homeDictionaries } from '@/features/home/i18n'

describe('home dictionary parity', () => {
  it('keeps list lengths and values aligned between English and Arabic', () => {
    const { en, ar } = homeDictionaries
    expect(ar.hero.stats.map((s) => s.value)).toEqual(en.hero.stats.map((s) => s.value))
    expect(ar.hero.highlights.map((s) => s.value)).toEqual(en.hero.highlights.map((s) => s.value))
    expect(ar.testimonials.items.map((t) => t.rating)).toEqual(
      en.testimonials.items.map((t) => t.rating),
    )
    expect(ar.howItWorks.steps).toHaveLength(en.howItWorks.steps.length)
    expect(ar.process.stages.map((s) => s.points.length)).toEqual(
      en.process.stages.map((s) => s.points.length),
    )
    expect(ar.features.items).toHaveLength(en.features.items.length)
  })

  it('names every country in both languages', () => {
    for (const country of countries) {
      expect(country.name.en).toBeTruthy()
      expect(country.name.ar).toBeTruthy()
    }
  })
})
