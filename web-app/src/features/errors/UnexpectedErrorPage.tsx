import { Link } from 'react-router-dom'

import { ErrorPageShell } from '@/components/errors/ErrorPageShell'
import { Button, buttonVariants } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

type UnexpectedErrorPageProps = {
  onReset?: () => void
}

export function UnexpectedErrorPage({ onReset }: UnexpectedErrorPageProps) {
  useDocumentTitle('Something went wrong')

  return (
    <ErrorPageShell
      code="500"
      title="Something went wrong"
      description="An unexpected error stopped this screen. You can try again or return home."
      actions={
        <>
          {onReset ? (
            <Button type="button" onClick={onReset}>
              Try again
            </Button>
          ) : null}
          <Link to="/" className={cn(buttonVariants({ variant: 'secondary' }))} onClick={onReset}>
            Back home
          </Link>
        </>
      }
    />
  )
}
