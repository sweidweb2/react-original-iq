import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ErrorPageShell } from '@/components/errors/ErrorPageShell'
import { Button, buttonVariants } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import { useMaintenanceStore } from '@/stores/maintenanceStore'

export function MaintenancePage() {
  useDocumentTitle('Under maintenance')
  const check = useMaintenanceStore((s) => s.check)
  const [isChecking, setIsChecking] = useState(false)

  async function onCheckAgain() {
    setIsChecking(true)
    try {
      const stillOn = await check({ force: true })
      if (stillOn) toast.info('Maintenance is still in progress. Please check back soon.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <ErrorPageShell
      code="503"
      title="We'll be back soon"
      description="Original IQ is under scheduled maintenance. Your work is safe — please check back in a little while."
      actions={
        <>
          <Button type="button" onClick={onCheckAgain} disabled={isChecking} aria-busy={isChecking}>
            {isChecking ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Check again
          </Button>
          <Link to="/" className={cn(buttonVariants({ variant: 'secondary' }))}>
            Back home
          </Link>
        </>
      }
    />
  )
}
