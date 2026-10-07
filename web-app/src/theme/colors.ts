/**
 * colors.ts — semantic palette for light mode.
 * Source of truth for brand tokens. Wired into:
 * - wired in `web-app/src/index.css` (:root)
 * Dark mode remains TBD.
 */

export const colors = {
  light: {
    primary: '#2FA084',
    secondary: '#6FCF97',
    background: '#EEEEEE',
    surface: '#FFFFFF',
    text: '#1F6F5F',
    textMuted: '#5A7A72',
    border: '#B7D4CC',
    success: '#2F9E71',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
    disabled: '#9CA3AF',
  },
  // dark: { … } — TBD
} as const

export type ColorToken = keyof typeof colors.light
