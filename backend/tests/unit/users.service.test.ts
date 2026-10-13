import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import type { UsersRepository } from '../../src/modules/users/users.repository.js'
import { createUsersService } from '../../src/modules/users/users.service.js'
import type { AccountRecord } from '../../src/modules/users/users.types.js'
import { toPublicUser } from '../../src/modules/users/users.types.js'

function makeAccount(overrides: Partial<AccountRecord> = {}): AccountRecord {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    passwordHash: 'hash',
    role: 'client',
    status: 'ACTIVE',
    profile: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const admin: AuthActor = { id: 'admin-1', roles: ['admin'] }
const self: AuthActor = { id: 'user-1', roles: ['client'] }
const other: AuthActor = { id: 'user-2', roles: ['tutor'] }

describe('users.service', () => {
  let repository: UsersRepository

  beforeEach(() => {
    repository = {
      findMany: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      createAccount: vi.fn(),
    }
  })

  it('lists users without password hashes', async () => {
    const account = makeAccount()
    vi.mocked(repository.findMany).mockResolvedValue([account])
    const service = createUsersService(repository)

    await expect(service.listUsers()).resolves.toEqual([toPublicUser(account)])
  })

  it('creates an account through the repository', async () => {
    const account = makeAccount()
    vi.mocked(repository.createAccount).mockResolvedValue(account)
    const service = createUsersService(repository)
    const input = {
      email: account.email,
      passwordHash: account.passwordHash,
      role: account.role,
    }

    await expect(service.createAccount(input)).resolves.toEqual(account)
    expect(repository.createAccount).toHaveBeenCalledWith(input)
  })

  it('returns a user by id', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAccount())
    const service = createUsersService(repository)

    await expect(service.getUserById('user-1')).resolves.toMatchObject({ id: 'user-1' })
  })

  it('rejects a missing user', async () => {
    vi.mocked(repository.findById).mockResolvedValue(null)
    const service = createUsersService(repository)

    await expect(service.getUserById('missing')).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    })
  })

  it('lets an admin or the same user read a record', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAccount())
    const service = createUsersService(repository)

    await expect(service.assertAccessible('user-1', admin)).resolves.toMatchObject({ id: 'user-1' })
    await expect(service.assertAccessible('user-1', self)).resolves.toMatchObject({ id: 'user-1' })
  })

  it('forbids another user from reading the record', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAccount())
    const service = createUsersService(repository)

    await expect(service.assertAccessible('user-1', other)).rejects.toMatchObject({ status: 403 })
  })

  it('create is not implemented yet', async () => {
    const service = createUsersService(repository)

    await expect(
      service.createUser({ email: 'new@example.com', name: 'New User', roles: ['client'] }),
    ).rejects.toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' })
  })

  it('update checks access, then reports not implemented', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAccount())
    const service = createUsersService(repository)

    await expect(service.updateUser('user-1', { name: 'Ada' }, other)).rejects.toMatchObject({
      status: 403,
    })
    await expect(service.updateUser('user-1', { name: 'Ada' }, self)).rejects.toMatchObject({
      status: 501,
      code: 'NOT_IMPLEMENTED',
    })
  })

  it('deactivate is admin-only and not implemented yet', async () => {
    vi.mocked(repository.findById).mockImplementation(async (id) =>
      id === 'user-1' ? makeAccount() : null,
    )
    const service = createUsersService(repository)

    await expect(service.deactivateUser('user-1', other)).rejects.toMatchObject({ status: 403 })
    await expect(service.deactivateUser('missing', admin)).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    })
    await expect(service.deactivateUser('user-1', admin)).rejects.toMatchObject({
      status: 501,
      code: 'NOT_IMPLEMENTED',
    })
  })
})
