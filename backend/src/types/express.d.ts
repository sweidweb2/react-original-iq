import type { RoleName } from '../modules/auth/auth.schema.js'

export type AuthUser = {
  id: string
  roles: RoleName[]
  permissions: readonly string[]
  sessionId?: string
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string
      user?: AuthUser
    }
  }
}

export {}
