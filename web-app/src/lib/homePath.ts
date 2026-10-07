import type { AuthRole } from '@/services/auth'

/** Post-login / guest-redirect home by role. */
export function homePathForRole(role: AuthRole | null | undefined): string {
  switch (role) {
    case 'SUPER':
      return '/super'
    case 'ADMIN':
      return '/admin'
    case 'TUTOR':
      return '/tutor'
    default:
      return '/'
  }
}
