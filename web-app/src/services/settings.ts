import { apiRequest } from './api'

export type PlatformSettings = {
  maintenanceMode: boolean
  emailsSend: boolean
  updatedBy: { id: string; name: string | null; email: string } | null
  updatedAt: string
}

export type UpdateSettingsInput = Partial<Pick<PlatformSettings, 'maintenanceMode' | 'emailsSend'>>

export function getMaintenanceStatus() {
  return apiRequest<{ maintenanceMode: boolean }>('/settings/status', { skipAuthRefresh: true })
}

export function getSettings() {
  return apiRequest<PlatformSettings>('/settings')
}

export function updateSettings(input: UpdateSettingsInput) {
  return apiRequest<PlatformSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
