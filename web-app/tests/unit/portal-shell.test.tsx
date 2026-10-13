import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ADMIN_NAV } from '@/features/portals/portalNav'
import { PortalShell } from '@/features/portals/PortalShell'
import { useAuthStore } from '@/stores/authStore'

function renderPortal(path = '/admin/classes') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PortalShell title="Admin portal" nav={ADMIN_NAV} />}>
          <Route path="/admin" element={<h1>Portal home</h1>} />
          <Route path="/admin/classes" element={<h1>Classes</h1>} />
        </Route>
        <Route path="/" element={<h1>Public home</h1>} />
        <Route path="/login" element={<h1>Sign in</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PortalShell account menu', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'sara.nabil@example.com',
        role: 'admin',
        profile: {
          firstName: 'Sara',
          lastName: 'Nabil',
          displayName: 'Sara Nabil',
        },
      },
      tokens: null,
      isHydrated: true,
    })
  })

  afterEach(() => {
    cleanup()
    useAuthStore.setState({ user: null, tokens: null })
  })

  it('uses a white header the same height as the sidebar brand row', () => {
    renderPortal()

    const header = screen.getByRole('banner')
    const sidebarBar = document.querySelector('[data-shell-bar="sidebar"]')

    expect(header.className).toContain('h-16')
    expect(header.className).toContain('bg-sidebar')
    expect(sidebarBar?.className).toContain('h-16')
    expect(sidebarBar?.className).toContain('bg-sidebar')
  })

  it('shows the first two letters of the user name and opens home or sign out', async () => {
    const user = userEvent.setup()
    renderPortal()

    await user.click(screen.getByRole('button', { name: 'Account menu for Sara Nabil' }))
    expect(screen.getByRole('button', { name: 'Account menu for Sara Nabil' })).toHaveTextContent('SA')
    expect(screen.getByRole('menuitem', { name: 'Go to home' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeVisible()

    await user.click(screen.getByRole('menuitem', { name: 'Go to home' }))
    expect(screen.getByRole('heading', { name: 'Public home' })).toBeVisible()
    expect(screen.queryByRole('menu', { name: 'Account' })).not.toBeInTheDocument()
  })

  it('signs out from the account menu', async () => {
    const user = userEvent.setup()
    renderPortal()

    await user.click(screen.getByRole('button', { name: 'Account menu for Sara Nabil' }))
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})
