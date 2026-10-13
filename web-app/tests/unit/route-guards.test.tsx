import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { GuestOnly, RequireAuth, RequireRole } from '@/components/auth'
import type { AuthUser } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

function user(role: AuthUser['role']): AuthUser {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    role,
    profile: { firstName: 'Ada', lastName: 'Lovelace', displayName: 'Ada Lovelace' },
  }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<h1>Sign in</h1>} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole roles={['admin']} fallbackTo="/">
                <h1>Admin home</h1>
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <h1>Root</h1>
            </RequireAuth>
          }
        />
        <Route path="/tutor" element={<h1>Tutor home</h1>} />
        <Route
          path="/guest"
          element={
            <GuestOnly>
              <h1>Guest screen</h1>
            </GuestOnly>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('route guards', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    useAuthStore.setState({ user: null, tokens: null, isHydrated: true })
  })

  it('sends a signed-out user to login', async () => {
    useAuthStore.setState({ user: null, tokens: null, isHydrated: true })
    renderAt('/admin')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  it('shows the portal when the role matches', async () => {
    useAuthStore.setState({ user: user('admin'), tokens: null, isHydrated: true })
    renderAt('/admin')

    expect(await screen.findByRole('heading', { name: 'Admin home' })).toBeVisible()
  })

  it('sends the wrong role to the fallback', async () => {
    useAuthStore.setState({ user: user('client'), tokens: null, isHydrated: true })
    renderAt('/admin')

    expect(await screen.findByRole('heading', { name: 'Root' })).toBeVisible()
  })

  it('shows access denied when the role does not match', async () => {
    useAuthStore.setState({ user: user('client'), tokens: null, isHydrated: true })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={['admin']}>
                <h1>Admin home</h1>
              </RequireRole>
            }
          />
          <Route path="/client" element={<h1>Client home</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Go to your portal' })).toHaveAttribute(
      'href',
      '/client',
    )
  })

  it('keeps a signed-out user on a guest screen', async () => {
    useAuthStore.setState({ user: null, tokens: null, isHydrated: true })
    renderAt('/guest')

    expect(await screen.findByRole('heading', { name: 'Guest screen' })).toBeVisible()
  })

  it('sends a signed-in user away from a guest screen', async () => {
    useAuthStore.setState({ user: user('tutor'), tokens: null, isHydrated: true })
    renderAt('/guest')

    expect(await screen.findByRole('heading', { name: 'Tutor home' })).toBeVisible()
  })
})
