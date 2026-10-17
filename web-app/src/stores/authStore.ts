import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { bindAuthSession } from '@/services/api'
import type { AuthTokens, AuthUser } from '@/services/auth'
import * as authApi from '@/services/auth'

type AuthState = {
  user: AuthUser | null
  tokens: AuthTokens | null
  isHydrated: boolean
  setHydrated: (value: boolean) => void
  setTokens: (tokens: AuthTokens) => void
  clearSession: () => void
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (input: {
    name?: string
    phone?: string | null
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }) => Promise<void>
  setUser: (user: AuthUser) => void
}

/**
 * Client auth session only — not an API cache.
 * Persist key + partialize: Docs/[3] Decisions/[5] Client State (Zustand).md
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isHydrated: false,
      setHydrated: (value) => set({ isHydrated: value }),
      setTokens: (tokens) => set({ tokens }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ user: null, tokens: null }),
      async login(email, password) {
        const result = await authApi.login(email, password)
        set({ user: result.user, tokens: result.tokens })
      },
      async register(input) {
        const result = await authApi.register(input)
        set({ user: result.user, tokens: result.tokens })
      },
      async logout() {
        const refreshToken = get().tokens?.refreshToken
        try {
          if (refreshToken) {
            await authApi.logout(refreshToken)
          }
        } finally {
          set({ user: null, tokens: null })
        }
      },
      async refreshProfile() {
        const result = await authApi.getMe()
        set({ user: result.user })
      },
      async updateProfile(input) {
        const result = await authApi.updateMe(input)
        set({ user: result.user })
      },
    }),
    {
      name: 'original-iq-web-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
      }),
      // localStorage rehydrates synchronously inside `create()`, before `useAuthStore` exists,
      // so mark hydration through the initial state's own setter (also on error).
      onRehydrateStorage: (initial) => (_state, error) => {
        if (error) {
          console.warn('auth rehydrate failed', error)
        }
        initial.setHydrated(true)
      },
    },
  ),
)

bindAuthSession({
  getAccessToken: () => useAuthStore.getState().tokens?.accessToken,
  getRefreshToken: () => useAuthStore.getState().tokens?.refreshToken,
  setTokens: (tokens) => useAuthStore.getState().setTokens(tokens),
  clearSession: () => useAuthStore.getState().clearSession(),
})
