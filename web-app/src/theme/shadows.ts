/**
 * shadows.ts — CSS box-shadow ladder (web).
 */

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(15 23 42 / 0.06)',
  md: '0 4px 8px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
  lg: '0 12px 24px -6px rgb(15 23 42 / 0.12), 0 4px 8px -4px rgb(15 23 42 / 0.06)',
  xl: '0 20px 40px -8px rgb(15 23 42 / 0.16), 0 8px 16px -6px rgb(15 23 42 / 0.08)',
} as const

export type ShadowToken = keyof typeof shadows
