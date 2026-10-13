/**
 * colors.ts — semantic palette.
 * Source of truth for brand tokens. Wired into `web-app/src/index.css` (:root).
 */

export const colors = {
  light: {
    primary: '#34B8C1',
    primaryDark: '#27949C',
    primaryLight: '#6DD6DC',
    accent: '#FF6B35',
    background: '#F7F9FA',
    surface: '#FFFFFF',
    text: '#0F1720',
    textMuted: '#5B6B73',
    border: '#E1E6E8',
    success: '#2F9E44',
    warning: '#F2A900',
    error: '#E53E3E',
  },
} as const

export type ColorToken = keyof typeof colors.light
