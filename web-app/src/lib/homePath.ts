import type { AuthRole } from '@/services/auth'

/** Post-login home by role — each role has its own portal. */
export function homePathForRole(role: AuthRole | null | undefined): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'coordinator':
      return '/coordinator'
    case 'tutor':
      return '/tutor'
    case 'client':
      return '/client'
    default:
      return '/login'
  }
}
