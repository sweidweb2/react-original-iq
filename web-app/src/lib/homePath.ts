import { PORTALS } from '@/features/portals/portalNav'
import type { AuthRole } from '@/services/auth'

/** Post-login home by role — each role has its own portal. */
export function homePathForRole(role: AuthRole | null | undefined): string {
  if (!role) return '/login'
  return PORTALS.find((portal) => portal.role === role)?.path ?? '/login'
}
