import { createContext } from 'react'

import type { Locale } from './config'

/** Set only inside `/:lang` routes. `null` means the page is not localized. */
export const LocaleContext = createContext<Locale | null>(null)
