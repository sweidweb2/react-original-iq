/**
 * sizes.ts — reusable layout / control dimensions (web, px).
 */

export const sizes = {
  header: 56,
  sidebar: 240,
  sidebarCollapsed: 64,
  buttonHeight: 36,
  buttonHeightSm: 32,
  buttonHeightLg: 40,
  inputHeight: 36,
  iconSm: 16,
  icon: 20,
  iconLg: 24,
  avatarSm: 32,
  avatar: 40,
  avatarLg: 48,
  maxContentWidth: 1280,
  maxFormWidth: 480,
} as const

export type SizeToken = keyof typeof sizes
