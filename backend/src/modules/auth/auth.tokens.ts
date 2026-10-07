import bcrypt from 'bcrypt'
import type { SignOptions } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'

import type { AppConfig } from '../../config/index.js'
import { requireJwtSecrets } from '../../config/index.js'
import type { RoleName } from './auth.schema.js'

const BCRYPT_ROUNDS = 12

export type AccessTokenPayload = {
  sub: string
  role: RoleName
  typ: 'access'
}

export type RefreshTokenPayload = {
  sub: string
  role: RoleName
  typ: 'refresh'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export function signAccessToken(config: AppConfig, userId: string, role: RoleName): string {
  const { accessSecret } = requireJwtSecrets(config)
  const options: SignOptions = { expiresIn: config.jwtAccessExpiresIn as SignOptions['expiresIn'] }
  const payload: AccessTokenPayload = { sub: userId, role, typ: 'access' }
  return jwt.sign(payload, accessSecret, options)
}

export function signRefreshToken(config: AppConfig, userId: string, role: RoleName): string {
  const { refreshSecret } = requireJwtSecrets(config)
  const options: SignOptions = {
    expiresIn: config.jwtRefreshExpiresIn as SignOptions['expiresIn'],
  }
  const payload: RefreshTokenPayload = { sub: userId, role, typ: 'refresh' }
  return jwt.sign(payload, refreshSecret, options)
}

export function verifyAccessToken(config: AppConfig, token: string): AccessTokenPayload {
  const { accessSecret } = requireJwtSecrets(config)
  const decoded = jwt.verify(token, accessSecret)
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
  const decoded = jwt.verify(token, refreshSecret)
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid refresh token')
  }
  const payload = decoded as RefreshTokenPayload
  if (payload.typ !== 'refresh' || !payload.sub || !payload.role) {
    throw new Error('Invalid refresh token payload')
  }
  return payload
}
