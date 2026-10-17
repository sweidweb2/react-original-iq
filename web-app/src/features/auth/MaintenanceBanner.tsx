import { Alert } from '@/components/ui/alert'
import { useMaintenanceStore } from '@/stores/maintenanceStore'

const MESSAGES = {
  login: 'Only platform administrators can sign in until maintenance is finished.',
  signup: 'New accounts can be created again once maintenance is finished.',
} as const

type MaintenanceBannerProps = {
  page: keyof typeof MESSAGES
}

export function MaintenanceBanner({ page }: MaintenanceBannerProps) {
  const maintenanceMode = useMaintenanceStore((s) => s.maintenanceMode)
  if (!maintenanceMode) return null

  return (
    <Alert tone="warning" title="Platform is under maintenance">
      {MESSAGES[page]}
    </Alert>
  )
}
