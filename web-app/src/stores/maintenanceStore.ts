import { create } from 'zustand'

import { bindMaintenance } from '@/services/api'
import { getMaintenanceStatus } from '@/services/settings'

const CHECK_THROTTLE_MS = 15_000

type MaintenanceState = {
  maintenanceMode: boolean
  /** False until the first status check settles. */
  isKnown: boolean
  checkedAt: number
  setMaintenance: (value: boolean) => void
  /** Re-reads `/settings/status`; throttled unless `force`. Keeps the last value on failure. */
  check: (options?: { force?: boolean }) => Promise<boolean>
}

let inFlight: Promise<boolean> | null = null

/** Platform maintenance flag (UI state only; the backend enforces it). */
export const useMaintenanceStore = create<MaintenanceState>()((set, get) => ({
  maintenanceMode: false,
  isKnown: false,
  checkedAt: 0,
  setMaintenance: (value) => set({ maintenanceMode: value, isKnown: true, checkedAt: Date.now() }),
  async check(options) {
    const state = get()
    if (!options?.force && state.isKnown && Date.now() - state.checkedAt < CHECK_THROTTLE_MS) {
      return state.maintenanceMode
    }
    if (inFlight) return inFlight

    inFlight = getMaintenanceStatus()
      .then(({ maintenanceMode }) => {
        get().setMaintenance(maintenanceMode)
        return maintenanceMode
      })
      .catch(() => {
        set({ isKnown: true })
        return get().maintenanceMode
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  },
}))

bindMaintenance(() => useMaintenanceStore.getState().setMaintenance(true))
