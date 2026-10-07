/**
 * radius.ts — border-radius scale (px). Matches modest control radius used in shadcn (~10px base).
 */

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const

export type RadiusToken = keyof typeof radius
