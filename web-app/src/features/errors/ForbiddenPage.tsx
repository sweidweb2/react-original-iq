import { Link } from 'react-router-dom'

import { ErrorPageShell } from '@/components/errors/ErrorPageShell'
import { buttonVariants } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { homePathForRole } from '@/lib/homePath'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

export function ForbiddenPage() {
  useDocumentTitle('Access denied')
  const role = useAuthStore((state) => state.user?.role)
  const home = homePathForRole(role)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ErrorPageShell
        code="403"
        title="Access denied"
        description="This area is limited to another role. You can return to your own portal."
        actions={
          <Link to={home} className={cn(buttonVariants())}>
            {role ? 'Go to your portal' : 'Back home'}
          </Link>
        }
      />
    </div>
  )
}
