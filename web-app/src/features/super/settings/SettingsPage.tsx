import { useId, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { AsyncState } from '@/components/feedback'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { formatAdminDate } from '@/features/admin/_shared/adminListFormat'
import { PortalPageShell, SectionCard } from '@/features/shared/PortalPageShell'
import { useAsyncData } from '@/hooks'
import {
  getSettings,
  type PlatformSettings,
  updateSettings,
  type UpdateSettingsInput,
} from '@/services/settings'
import { toastApiError, toastSuccess } from '@/services/toast'
import { useMaintenanceStore } from '@/stores/maintenanceStore'

type SettingKey = keyof UpdateSettingsInput

type SettingRowProps = {
  title: string
  description: string
  checked: boolean
  saving: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}

function SettingRow({
  title,
  description,
  checked,
  saving,
  disabled,
  onCheckedChange,
}: SettingRowProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p id={titleId} className="text-sm font-medium">
          {title}
        </p>
        <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {saving ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
        <Switch
          checked={checked}
          disabled={disabled}
          aria-busy={saving}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onCheckedChange={onCheckedChange}
        />
      </div>
    </div>
  )
}

function lastChanged(settings: PlatformSettings): string {
  if (!settings.updatedBy) return 'Never changed'
  const who = settings.updatedBy.name?.trim() || settings.updatedBy.email || 'Unknown user'
  return `Last changed by ${who} on ${formatAdminDate(settings.updatedAt, true)}`
}

export function SettingsPage() {
  const { data, isLoading, error, reload } = useAsyncData(getSettings)
  const [saved, setSaved] = useState<PlatformSettings | null>(null)
  const [saving, setSaving] = useState<SettingKey | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const setMaintenance = useMaintenanceStore((s) => s.setMaintenance)

  const settings = saved ?? data

  async function save(input: UpdateSettingsInput, key: SettingKey, successTitle: string) {
    setSaving(key)
    try {
      const result = await updateSettings(input)
      setSaved(result)
      setMaintenance(result.maintenanceMode)
      toastSuccess(successTitle)
    } catch (saveError) {
      toastApiError(saveError, "Couldn't update settings")
    } finally {
      setSaving(null)
    }
  }

  function onMaintenanceChange(checked: boolean) {
    if (checked) {
      setConfirmOpen(true)
      return
    }
    void save({ maintenanceMode: false }, 'maintenanceMode', 'Maintenance mode turned off')
  }

  async function confirmMaintenance() {
    setConfirmOpen(false)
    await save({ maintenanceMode: true }, 'maintenanceMode', 'Maintenance mode turned on')
  }

  return (
    <PortalPageShell
      title="Settings"
      description="Platform-wide switches. Changes apply to every user within a few seconds."
      maxWidth="4xl"
    >
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {settings ? (
          <div className="flex flex-col gap-6">
            {settings.maintenanceMode ? (
              <Alert tone="warning" title="Maintenance mode is on">
                Only SUPER users can sign in or use the platform. Everyone else sees the maintenance
                page until you turn it off.
              </Alert>
            ) : null}

            <SectionCard title="Platform" description={lastChanged(settings)}>
              <div className="divide-y divide-border">
                <SettingRow
                  title="Maintenance mode"
                  description="Blocks sign-in, sign-up, and every operation for all users except SUPER. Signed-in users are sent to the maintenance page."
                  checked={settings.maintenanceMode}
                  saving={saving === 'maintenanceMode'}
                  disabled={saving !== null}
                  onCheckedChange={onMaintenanceChange}
                />
                <SettingRow
                  title="Send emails"
                  description="When off, outgoing emails such as invoices are logged on the server instead of being sent."
                  checked={settings.emailsSend}
                  saving={saving === 'emailsSend'}
                  disabled={saving !== null}
                  onCheckedChange={(checked) =>
                    void save(
                      { emailsSend: checked },
                      'emailsSend',
                      checked ? 'Email sending turned on' : 'Email sending turned off',
                    )
                  }
                />
              </div>
            </SectionCard>
          </div>
        ) : null}
      </AsyncState>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Turn on maintenance mode?"
        description="Everyone except SUPER users will be sent to the maintenance page and won't be able to sign in, sign up, or perform any action until you turn it off."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirmMaintenance()}>
              Turn on
            </Button>
          </>
        }
      />
    </PortalPageShell>
  )
}
