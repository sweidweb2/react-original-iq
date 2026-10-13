/**
 * radius.ts — border-radius scale (px).
 */

export const radius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 18,
  full: 9999,
} as const

export type RadiusToken = keyof typeof radius
