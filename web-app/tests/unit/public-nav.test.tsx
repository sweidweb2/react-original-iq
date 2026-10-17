import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { PublicLayout } from '@/features/public/PublicLayout'
import { localizedPublicRoutes } from '@/features/public/publicRoutes'
import { useLocaleStore } from '@/stores/localeStore'

function renderPublic(path = '/en') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {localizedPublicRoutes()}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<h1>Sign in</h1>} />
          <Route path="/signup" element={<h1>Create account</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('public navbar', () => {
  afterEach(() => {
    cleanup()
    useLocaleStore.setState({ preferredLocale: null })
  })

  it('opens every public page from the navbar', async () => {
    const user = userEvent.setup()
    renderPublic()

    const nav = screen.getByRole('navigation', { name: 'Public' })
    expect(screen.getByRole('heading', { name: 'Learn Smarter' })).toBeInTheDocument()

    await user.click(within(nav).getByRole('link', { name: 'About' }))
    expect(screen.getByRole('heading', { name: 'About OriginaliQ' })).toBeInTheDocument()

    await user.click(within(nav).getByRole('link', { name: 'Services' }))
    expect(screen.getByRole('heading', { name: /Guiding every learner/ })).toBeInTheDocument()

    await user.click(within(nav).getByRole('link', { name: 'FAQ' }))
    expect(screen.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeInTheDocument()

    await user.click(within(nav).getByRole('link', { name: 'Contact' }))
    expect(screen.getByRole('heading', { name: 'Send Us a Message' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Login' }))
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Sign up' }))
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()

    await user.click(
      within(screen.getByRole('navigation', { name: 'Support' })).getByRole('link', {
        name: 'Terms of Service',
      }),
    )
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument()
  })
})
