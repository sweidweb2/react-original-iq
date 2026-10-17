import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { detectBrowserLocale, type Locale } from '@/i18n/config'

type LocaleState = {
  preferredLocale: Locale | null
  setPreferredLocale: (locale: Locale) => void
}

/** Public-site language preference only; the URL prefix is the source of truth on public pages. */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      preferredLocale: null,
      setPreferredLocale: (locale) => set({ preferredLocale: locale }),
    }),
    {
      name: 'original-iq-web-locale',
      partialize: (state) => ({ preferredLocale: state.preferredLocale }),
    },
  ),
)

export function getPreferredLocale(): Locale {
  return useLocaleStore.getState().preferredLocale ?? detectBrowserLocale()
}
