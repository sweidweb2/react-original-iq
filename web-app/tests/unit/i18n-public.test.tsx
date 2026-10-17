import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { createContactSchemas } from '@/features/public/contact/contact.schema'
import { faqContent } from '@/features/public/content/faq'
import { legalContent } from '@/features/public/content/legal'
import { servicesContent } from '@/features/public/content/services'
import { publicDictionaries } from '@/features/public/i18n'
import { localizedPublicRoutes } from '@/features/public/publicRoutes'
import { localizePath, stripLocale, switchLocalePath } from '@/i18n'
import { parseForm } from '@/lib/form'
import { useLocaleStore } from '@/stores/localeStore'

function LocationProbe() {
  const { pathname, hash } = useLocation()
  return <output data-testid="location">{`${pathname}${hash}`}</output>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{localizedPublicRoutes()}</Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  useLocaleStore.setState({ preferredLocale: null })
})

describe('locale paths', () => {
  it('prefixes, strips, and swaps the locale segment', () => {
    expect(localizePath('ar', '/')).toBe('/ar')
    expect(localizePath('en', '/#how-it-works')).toBe('/en#how-it-works')
    expect(localizePath('ar', '/services#tutoring')).toBe('/ar/services#tutoring')
    expect(stripLocale('/ar/about')).toBe('/about')
    expect(stripLocale('/en')).toBe('/')
    expect(stripLocale('/login')).toBe('/login')
    expect(switchLocalePath('ar', '/en/faq', '?q=1', '#top')).toBe('/ar/faq?q=1#top')
  })
})

describe('localized public routes', () => {
  it('renders Arabic pages right-to-left', () => {
    renderAt('/ar/about')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(
      screen.getByRole('heading', { level: 1, name: 'تعرّف على OriginaliQ' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeInTheDocument()
  })

  it('restores left-to-right for English', () => {
    renderAt('/en/faq')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(screen.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeInTheDocument()
  })

  it('switches language while keeping the path and hash', async () => {
    const user = userEvent.setup()
    renderAt('/en/faq#pricing')

    const arabic = screen.getByRole('link', { name: 'العربية' })
    expect(arabic).toHaveAttribute('href', '/ar/faq#pricing')

    await user.click(arabic)
    expect(screen.getByTestId('location')).toHaveTextContent('/ar/faq#pricing')
    expect(screen.getByRole('heading', { level: 1, name: 'الأسئلة الشائعة' })).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
    expect(useLocaleStore.getState().preferredLocale).toBe('ar')
  })

  it('redirects unprefixed URLs to the preferred locale', () => {
    useLocaleStore.setState({ preferredLocale: 'ar' })
    renderAt('/faq#pricing')
    expect(screen.getByTestId('location')).toHaveTextContent('/ar/faq#pricing')
  })

  it('redirects the root to English by default', () => {
    renderAt('/')
    expect(screen.getByTestId('location')).toHaveTextContent('/en')
    expect(screen.getByRole('heading', { name: 'Learn Smarter' })).toBeInTheDocument()
  })

  it('shows not found for an unknown locale', () => {
    renderAt('/xx/about')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('ltr')
  })
})

describe('content parity', () => {
  it('keeps FAQ categories and item counts aligned', () => {
    const shape = (locale: 'en' | 'ar') =>
      faqContent[locale].map((category) => [category.id, category.items.length])
    expect(shape('ar')).toEqual(shape('en'))
  })

  it('keeps legal section ids and paragraph counts aligned', () => {
    for (const key of ['terms', 'privacy', 'refunds'] as const) {
      const shape = (locale: 'en' | 'ar') =>
        legalContent[locale][key].sections.map((s) => [s.id, s.paragraphs.length])
      expect(shape('ar')).toEqual(shape('en'))
      expect(legalContent.ar[key].company).toHaveLength(legalContent.en[key].company.length)
    }
  })

  it('keeps service ids, icons, and prices aligned', () => {
    const shape = (locale: 'en' | 'ar') => {
      const c = servicesContent[locale]
      return {
        trending: c.trendingSubjects.length,
        stats: c.heroStats.map((s) => s.tone),
        sections: c.serviceSections.map((s) => ({
          id: s.id,
          accent: s.accent,
          points: s.points.map((p) => p.icon),
          orbit: s.orbit.map((o) => o.icon),
        })),
        steps: c.programSteps.length,
        benefits: c.benefits.map((b) => b.icon),
        plans: c.pricingPlans.map((p) => [p.kind, p.start, p.max, p.factors.map((f) => f.icon)]),
      }
    }
    expect(shape('ar')).toEqual(shape('en'))
  })

  it('keeps About list lengths aligned', () => {
    const { en, ar } = publicDictionaries
    expect(ar.about.stats.map((s) => s.value)).toEqual(en.about.stats.map((s) => s.value))
    expect(ar.about.steps).toHaveLength(en.about.steps.length)
    expect(ar.about.benefits).toHaveLength(en.about.benefits.length)
  })
})

describe('localized validation', () => {
  it('returns Arabic messages from the Arabic schema', () => {
    const { contactMessageSchema } = createContactSchemas(publicDictionaries.ar.contact.validation)
    const result = parseForm(contactMessageSchema, {
      name: '',
      email: 'x',
      subject: '',
      message: '',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.fieldErrors.name).toBe('يرجى إدخال اسمك')
    expect(result.fieldErrors.message).toBe('يرجى كتابة رسالتك')
  })
})
