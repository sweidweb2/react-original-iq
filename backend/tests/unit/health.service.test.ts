import { describe, expect, it, vi } from 'vitest'

import type { HealthRepository } from '../../src/modules/health/health.repository.js'
import { createHealthService } from '../../src/modules/health/health.service.js'

describe('health.service', () => {
  it('returns ok for liveness', () => {
    const repository: HealthRepository = { ping: vi.fn() }
    const service = createHealthService(repository)
    expect(service.getHealth()).toEqual({ ok: true })
  })

  it('returns db ok when ping succeeds', async () => {
    const repository: HealthRepository = {
      ping: vi.fn().mockResolvedValue('ok'),
    }
    const service = createHealthService(repository)
    await expect(service.getDbHealth()).resolves.toEqual({ ok: true, db: true })
  })

  it('throws when Supabase is not configured', async () => {
    const repository: HealthRepository = {
      ping: vi.fn().mockResolvedValue('not_configured'),
    }
    const service = createHealthService(repository)
    await expect(service.getDbHealth()).rejects.toMatchObject({
      status: 503,
      code: 'DB_NOT_CONFIGURED',
    })
  })

  it('throws when ping fails', async () => {
    const repository: HealthRepository = {
      ping: vi.fn().mockResolvedValue('unavailable'),
    }
    const service = createHealthService(repository)
    await expect(service.getDbHealth()).rejects.toMatchObject({
      status: 503,
      code: 'DB_UNAVAILABLE',
    })
  })
})
