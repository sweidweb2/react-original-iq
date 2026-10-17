import { afterEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'original-iq-web-auth'

describe('auth store hydration', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('restores the persisted session and is hydrated as soon as the module loads', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          user: { id: 'u-1', email: 'client@example.com', role: 'client' },
          tokens: { accessToken: 'access', refreshToken: 'refresh' },
        },
        version: 0,
      }),
    )
    const warn = vi.spyOn(console, 'warn')
    vi.resetModules()

    const { useAuthStore } = await import('@/stores/authStore')
    const state = useAuthStore.getState()

    expect(state.isHydrated).toBe(true)
    expect(state.tokens?.accessToken).toBe('access')
    expect(state.user?.email).toBe('client@example.com')
    expect(warn).not.toHaveBeenCalled()
  })

  it('is hydrated with an empty session when nothing is stored', async () => {
    vi.resetModules()
    const { useAuthStore } = await import('@/stores/authStore')

    expect(useAuthStore.getState()).toMatchObject({ isHydrated: true, user: null, tokens: null })
  })
})
