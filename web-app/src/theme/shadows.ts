/**
 * shadows.ts — CSS box-shadow ladder.
 */

export const shadows = {
  none: 'none',
  sm: '0 1px 3px rgba(13, 30, 35, 0.06)',
  md: '0 6px 18px rgba(13, 30, 35, 0.08)',
  lg: '0 10px 40px rgba(13, 30, 35, 0.12)',
  primary: '0 4px 12px rgba(52, 184, 193, 0.3)',
  primaryHover: '0 6px 20px rgba(52, 184, 193, 0.4)',
} as const

export type ShadowToken = keyof typeof shadows
