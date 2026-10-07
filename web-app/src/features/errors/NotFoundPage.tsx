import { Link } from 'react-router-dom'

import { ErrorPageShell } from '@/components/errors/ErrorPageShell'
import { buttonVariants } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function NotFoundPage() {
  useDocumentTitle('Not found')

  return (
    <ErrorPageShell
      code="404"
      title="Page not found"
      description="That URL does not match any screen in Original IQ."
      actions={
        <Link to="/" className={cn(buttonVariants())}>
          Back home
        </Link>
      }
    />
  )
}
