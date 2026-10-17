import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SettingsRepository } from '../../src/modules/settings/settings.repository.js'
import { createSettingsService } from '../../src/modules/settings/settings.service.js'
import type { PlatformSettings } from '../../src/modules/settings/settings.types.js'

const ACTOR = { id: 'super-1', roles: ['super'] }

function makeRepository(initial: Partial<PlatformSettings> = {}) {
  let row: PlatformSettings = {
    maintenanceMode: false,
    emailsSend: true,
    updatedBy: null,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...initial,
  }
  const repository: SettingsRepository = {
    get: vi.fn(async () => ({ ...row })),
    update: vi.fn(async (input) => {
      row = {
        ...row,
        maintenanceMode: input.maintenanceMode ?? row.maintenanceMode,
        emailsSend: input.emailsSend ?? row.emailsSend,
        updatedBy: { id: input.updatedBy, name: null, email: '' },
      }
      return { ...row }
    }),
  }
  return {
    repository,
    setRow(patch: Partial<PlatformSettings>) {
      row = { ...row, ...patch }
    },
  }
}

describe('settings.service', () => {
  let clock = 0
  const now = () => clock

  beforeEach(() => {
    clock = 1_000
  })

  it('caches reads until the TTL expires', async () => {
    const { repository, setRow } = makeRepository()
    const service = createSettingsService(repository, { ttlMs: 10_000, now })

    expect(await service.isMaintenance()).toBe(false)
    setRow({ maintenanceMode: true })
    expect(await service.isMaintenance()).toBe(false)
    expect(repository.get).toHaveBeenCalledTimes(1)

    clock += 10_001
    expect(await service.isMaintenance()).toBe(true)
    expect(repository.get).toHaveBeenCalledTimes(2)
  })

  it('applies updates immediately on the same instance', async () => {
    const { repository } = makeRepository()
    const service = createSettingsService(repository, { ttlMs: 10_000, now })

    expect(await service.isEmailSendingEnabled()).toBe(true)
    const updated = await service.update({ emailsSend: false }, ACTOR)

    expect(updated.emailsSend).toBe(false)
    expect(repository.update).toHaveBeenCalledWith({ emailsSend: false, updatedBy: 'super-1' })
    expect(await service.isEmailSendingEnabled()).toBe(false)
  })

  it('falls back to the last known value when the read fails', async () => {
    const { repository } = makeRepository({ maintenanceMode: true })
    const service = createSettingsService(repository, { ttlMs: 10, now })

    expect(await service.isMaintenance()).toBe(true)
    clock += 20
    vi.mocked(repository.get).mockRejectedValueOnce(new Error('db down'))
    expect(await service.isMaintenance()).toBe(true)
  })

  it('defaults to open with emails on when nothing was ever read', async () => {
    const { repository } = makeRepository()
    vi.mocked(repository.get).mockRejectedValue(new Error('db down'))
    const service = createSettingsService(repository, { now })

    expect(await service.getStatus()).toEqual({ maintenanceMode: false })
    expect(await service.isEmailSendingEnabled()).toBe(true)
  })
})
