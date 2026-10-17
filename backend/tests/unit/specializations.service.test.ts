import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import type { SpecializationsRepository } from '../../src/modules/specializations/specializations.repository.js'
import { createSpecializationsService } from '../../src/modules/specializations/specializations.service.js'
import type { Specialization } from '../../src/modules/specializations/specializations.types.js'
import type { UsersService } from '../../src/modules/users/users.service.js'
import type { AccountRecord } from '../../src/modules/users/users.types.js'

function makeSpec(overrides: Partial<Specialization> = {}): Specialization {
  return {
    id: 'spec-1',
    tutorId: 'tutor-1',
    name: 'Calculus',
    note: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeTutor(overrides: Partial<AccountRecord> = {}): AccountRecord {
  return {
    id: 'tutor-1',
    email: 'tutor@example.com',
    passwordHash: 'hash',
    role: 'tutor',
    status: 'ACTIVE',
    phone: null,
    profile: { firstName: 'Tu', lastName: 'Tor', displayName: 'Tutor' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const admin: AuthActor = { id: 'admin-1', roles: ['admin'] }
const coordinator: AuthActor = { id: 'coord-1', roles: ['coordinator'] }
const tutor: AuthActor = { id: 'tutor-1', roles: ['tutor'] }
const otherTutor: AuthActor = { id: 'tutor-2', roles: ['tutor'] }
const client: AuthActor = { id: 'client-1', roles: ['client'] }

describe('specializations.service', () => {
  let repository: SpecializationsRepository
  let users: UsersService

  beforeEach(() => {
    repository = {
      listByTutorId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deleteById: vi.fn(),
    }
    users = {
      findById: vi.fn(),
    } as unknown as UsersService
  })

  it('lets a tutor read own specializations', async () => {
    vi.mocked(repository.listByTutorId).mockResolvedValue([makeSpec()])
    const service = createSpecializationsService(repository, users)

    await expect(service.list({ tutorId: 'tutor-1' }, tutor)).resolves.toEqual([makeSpec()])
  })

  it('forbids a tutor from reading another tutor specializations', async () => {
    const service = createSpecializationsService(repository, users)

    await expect(service.list({ tutorId: 'tutor-1' }, otherTutor)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('lets admin and coordinator create for a tutor', async () => {
    vi.mocked(users.findById).mockResolvedValue(makeTutor())
    vi.mocked(repository.create).mockResolvedValue(makeSpec())
    const service = createSpecializationsService(repository, users)

    await expect(service.create({ tutorId: 'tutor-1', name: 'Calculus' }, admin)).resolves.toEqual(
      makeSpec(),
    )
    await expect(
      service.create({ tutorId: 'tutor-1', name: 'Algebra' }, coordinator),
    ).resolves.toEqual(makeSpec())
  })

  it('forbids clients and tutors from creating specializations', async () => {
    const service = createSpecializationsService(repository, users)

    await expect(
      service.create({ tutorId: 'tutor-1', name: 'Calculus' }, client),
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      service.create({ tutorId: 'tutor-1', name: 'Calculus' }, tutor),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('rejects create when target is not a tutor', async () => {
    vi.mocked(users.findById).mockResolvedValue(makeTutor({ role: 'client' }))
    const service = createSpecializationsService(repository, users)

    await expect(
      service.create({ tutorId: 'tutor-1', name: 'Calculus' }, admin),
    ).rejects.toMatchObject({ status: 400 })
  })
})
