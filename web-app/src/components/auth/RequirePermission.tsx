import type { ReactNode } from 'react'

import { ForbiddenPage } from '@/features/errors/ForbiddenPage'
import { type PermissionCheck, useCan } from '@/lib/permissions'

type RequirePermissionProps = {
  /** One key, or a list where any one key is enough. */
  permission: PermissionCheck
  children: ReactNode
}

/** Route-level UX gate by permission. Backend must still authorize the API. */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const can = useCan()
  if (!can(permission)) return <ForbiddenPage />
  return children
}
