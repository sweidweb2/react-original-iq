import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import type { UsersRepository } from '../../src/modules/users/users.repository.js'
import { createUsersService } from '../../src/modules/users/users.service.js'
import type { AccountRecord } from '../../src/modules/users/users.types.js'
import { toPublicUser } from '../../src/modules/users/users.types.js'

vi.mock('../../src/modules/auth/auth.tokens.js', () => ({
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
}))

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

const listQuery = { page: 1, limit: 20 }

describe('users.service', () => {
  let repository: UsersRepository

  beforeEach(() => {
    repository = {
      findMany: vi.fn(),
      findPage: vi.fn(),
      countStats: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
    }
  })

  it('lists a page of users without password hashes', async () => {
    const account = makeAccount()
    vi.mocked(repository.findPage).mockResolvedValue({ items: [account], total: 1 })
    const service = createUsersService(repository)

    await expect(service.listUsers(listQuery)).resolves.toEqual({
      data: [toPublicUser(account)],
      meta: { page: 1, limit: 20, total: 1 },
    })
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

  it('creates a user with a hashed password', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null)
    vi.mocked(repository.createAccount).mockImplementation(async (input) =>
      makeAccount({
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        profile: { firstName: 'New', lastName: 'User', displayName: input.name ?? 'New User' },
      }),
    )
    const service = createUsersService(repository)

    const created = await service.createUser({
      email: 'new@example.com',
      name: 'New User',
      password: 'password1',
      role: 'tutor',
    })

    expect(created).toMatchObject({ email: 'new@example.com', role: 'tutor' })
    expect(created).not.toHaveProperty('passwordHash')
    expect(hashPassword).toHaveBeenCalledWith('password1')
    expect(repository.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        passwordHash: 'hash:password1',
        role: 'tutor',
        name: 'New User',
      }),
    )
  })

  it('rejects a duplicate email', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeAccount())
    const service = createUsersService(repository)

    await expect(
      service.createUser({
        email: 'ada@example.com',
        name: 'Ada',
        password: 'password1',
        role: 'client',
      }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('lets an admin update a user', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAccount())
    vi.mocked(repository.updateAccount).mockImplementation(async (_id, input) =>
      makeAccount({
        profile: { firstName: 'Ada', lastName: null, displayName: input.name ?? 'Ada Lovelace' },
        role: input.role ?? 'client',
        status: input.status ?? 'ACTIVE',
      }),
    )
    const service = createUsersService(repository)

    await expect(
      service.updateUser('user-1', { name: 'Ada', role: 'tutor' }, admin),
    ).resolves.toMatchObject({
      role: 'tutor',
      profile: expect.objectContaining({ displayName: 'Ada' }),
    })
  })

  it('forbids another user from updating the record', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAccount())
    const service = createUsersService(repository)

    await expect(service.updateUser('user-1', { name: 'Ada' }, other)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('forbids a non-admin from changing role or status', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAccount())
    const service = createUsersService(repository)

    await expect(service.updateUser('user-1', { role: 'admin' }, self)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('forbids an admin from deactivating their own account', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAccount({ id: 'admin-1', role: 'admin' }))
    const service = createUsersService(repository)

    await expect(
      service.updateUser('admin-1', { status: 'INACTIVE' }, admin),
    ).rejects.toMatchObject({ status: 403 })
    await expect(service.deactivateUser('admin-1', admin)).rejects.toMatchObject({ status: 403 })
  })

  it('deactivates a user for an admin', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAccount())
    vi.mocked(repository.updateAccount).mockResolvedValue(makeAccount({ status: 'INACTIVE' }))
    const service = createUsersService(repository)

    await expect(service.deactivateUser('user-1', admin)).resolves.toMatchObject({
      status: 'INACTIVE',
    })
    expect(repository.updateAccount).toHaveBeenCalledWith('user-1', { status: 'INACTIVE' })
  })

  it('deactivate is admin-only and 404 when the user is missing', async () => {
    vi.mocked(repository.findById).mockImplementation(async (id) =>
      id === 'user-1' ? makeAccount() : null,
    )
    const service = createUsersService(repository)

    await expect(service.deactivateUser('user-1', other)).rejects.toMatchObject({ status: 403 })
    await expect(service.deactivateUser('missing', admin)).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    })
  })
})
