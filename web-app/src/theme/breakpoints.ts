/**
 * breakpoints.ts — responsive breakpoints (web only, px min-width).
 * Aligns with common Tailwind / ops-dashboard tiers.
 */

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type BreakpointToken = keyof typeof breakpoints
