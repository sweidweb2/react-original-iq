export type PlatformSettings = {
  maintenanceMode: boolean
  emailsSend: boolean
  updatedBy: { id: string; name: string | null; email: string } | null
  updatedAt: Date
}

export type MaintenanceStatus = {
  maintenanceMode: boolean
}
