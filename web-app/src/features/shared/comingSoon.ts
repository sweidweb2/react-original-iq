import { toast } from '@/components/ui/toast'

export function comingSoon(feature = 'This action') {
  toast.success(`${feature} will be available soon.`)
}
