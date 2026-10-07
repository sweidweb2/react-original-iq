/**
 * index.ts — single entry point for the web theme.
 *
 * Components should import from here:
 *   import { theme, colors, spacing } from '@/theme'
 *   // or: import { theme } from '../theme'
 *
 * Web includes breakpoints + zIndex; mobile does not.
 */

export * from './breakpoints'
export * from './colors'
export * from './radius'
export * from './shadows'
export * from './sizes'
export * from './spacing'
export * from './typography'
export * from './zIndex'

import { breakpoints } from './breakpoints'
import { colors } from './colors'
import { radius } from './radius'
import { shadows } from './shadows'
import { sizes } from './sizes'
import { spacing } from './spacing'
import { typography } from './typography'
import { zIndex } from './zIndex'

export const theme = {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  sizes,
  breakpoints,
  zIndex,
} as const

export type Theme = typeof theme
