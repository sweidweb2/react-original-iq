import bcrypt from 'bcrypt'
import type { VerifyOptions } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'

import type { AppConfig } from '../../config/index.js'
import { requireJwtSecrets } from '../../config/index.js'
import type { RoleName } from './auth.schema.js'

const BCRYPT_ROUNDS = 12

const VERIFY_OPTIONS: VerifyOptions = { algorithms: ['HS256'] }

export type AccessTokenPayload = {
  sub: string
  role: RoleName
  typ: 'access'
  sid?: string
}

export type RefreshTokenPayload = {
  sub: string
  role: RoleName
  typ: 'refresh'
  sid: string
}

/** Server-side session a token belongs to; tokens never outlive `expiresAt`. */
export type SessionClaims = {
  id: string
  expiresAt: Date
}

function toJwtExp(epochMs: number): number {
  return Math.floor(epochMs / 1000)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export function signAccessToken(
  config: AppConfig,
  userId: string,
  role: RoleName,
  session?: SessionClaims,
): string {
  const { accessSecret } = requireJwtSecrets(config)
  const defaultExpiry = Date.now() + config.jwtAccessTtlMs
  const expiry = session ? Math.min(defaultExpiry, session.expiresAt.getTime()) : defaultExpiry
  const payload: AccessTokenPayload = {
    sub: userId,
    role,
    typ: 'access',
    ...(session ? { sid: session.id } : {}),
  }
  return jwt.sign({ ...payload, exp: toJwtExp(expiry) }, accessSecret)
}

export function signRefreshToken(
  config: AppConfig,
  userId: string,
  role: RoleName,
  session: SessionClaims,
): string {
  const { refreshSecret } = requireJwtSecrets(config)
  const payload: RefreshTokenPayload = { sub: userId, role, typ: 'refresh', sid: session.id }
  return jwt.sign({ ...payload, exp: toJwtExp(session.expiresAt.getTime()) }, refreshSecret)
}

export function verifyAccessToken(config: AppConfig, token: string): AccessTokenPayload {
  const { accessSecret } = requireJwtSecrets(config)
  const decoded = jwt.verify(token, accessSecret, VERIFY_OPTIONS)
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid access token')
  }
  const payload = decoded as AccessTokenPayload
  if (payload.typ !== 'access' || !payload.sub || !payload.role) {
    throw new Error('Invalid access token payload')
  }
  return payload
}

export function verifyRefreshToken(config: AppConfig, token: string): RefreshTokenPayload {
  const { refreshSecret } = requireJwtSecrets(config)
  const decoded = jwt.verify(token, refreshSecret, VERIFY_OPTIONS)
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid refresh token')
  }
  const payload = decoded as RefreshTokenPayload
  if (payload.typ !== 'refresh' || !payload.sub || !payload.role || !payload.sid) {
    throw new Error('Invalid refresh token payload')
  }
  return payload
}
