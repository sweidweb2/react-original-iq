import type { Express } from 'express'
import request from 'supertest'
import { expect } from 'vitest'

import type { AppConfig } from '../../src/config/index.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { createUsersRepository } from '../../src/modules/users/users.repository.js'
import type { UserRole } from '../../src/modules/users/users.types.js'

export type HttpActor = { id: string; token: string; auth: [string, string] }

const PASSWORD = 'password1'

/** Creates an active account with `role` and logs it in through the API. */
export async function createActor(
  app: Express,
  config: AppConfig,
  role: UserRole,
  email: string,
): Promise<HttpActor> {
  const account = await createUsersRepository(config).createAccount({
    email,
    passwordHash: await hashPassword(PASSWORD),
    role,
    firstName: role,
    lastName: 'Actor',
  })
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })
  expect(login.status).toBe(200)
  const token = login.body.tokens.accessToken as string
  return { id: account.id, token, auth: ['Authorization', `Bearer ${token}`] }
}

export type RoleCast = {
  super: HttpActor
  admin: HttpActor
  coordinator: HttpActor
  otherCoordinator: HttpActor
  tutor: HttpActor
  otherTutor: HttpActor
  client: HttpActor
  otherClient: HttpActor
}

/** One actor per role plus an unrelated coordinator, tutor and client; emails use `prefix`. */
export async function createRoleCast(
  app: Express,
  config: AppConfig,
  prefix: string,
): Promise<RoleCast> {
  const make = (role: UserRole, name: string) =>
    createActor(app, config, role, `${prefix}-${name}@originaliq.test`)
  return {
    super: await make('super', 'super'),
    admin: await make('admin', 'admin'),
    coordinator: await make('coordinator', 'coordinator'),
    otherCoordinator: await make('coordinator', 'other-coordinator'),
    tutor: await make('tutor', 'tutor'),
    otherTutor: await make('tutor', 'other-tutor'),
    client: await make('client', 'client'),
    otherClient: await make('client', 'other-client'),
  }
}

export type TaskOverrides = { price?: number; tutorId?: string }

/** Task owned by `cast.client` and managed by `cast.coordinator` (the coordinator creates it). */
export async function createManagedTask(
  app: Express,
  cast: RoleCast,
  overrides: TaskOverrides = {},
): Promise<Record<string, unknown> & { id: string }> {
  const res = await request(app)
    .post('/api/v1/tasks')
    .set(...cast.coordinator.auth)
    .send({
      clientId: cast.client.id,
      topic: 'Role matrix task',
      type: 'assignment',
      category: 'Writing',
      description: 'Created by the role-matrix tests',
      deadline: '2030-01-01T12:00:00.000Z',
      ...overrides,
    })
  expect(res.status).toBe(201)
  expect(res.body).toMatchObject({ clientId: cast.client.id, coordinatorId: cast.coordinator.id })
  return res.body as Record<string, unknown> & { id: string }
}

/** Asserts each actor gets `status` for the same request. */
export async function expectStatusFor(
  actors: Record<string, HttpActor>,
  status: number,
  send: (actor: HttpActor) => request.Test,
): Promise<void> {
  for (const [name, actor] of Object.entries(actors)) {
    const res = await send(actor)
    expect({ actor: name, status: res.status }).toEqual({ actor: name, status })
  }
}
