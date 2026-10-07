import type { RoleName } from '../modules/auth/auth.schema.js'

export type AuthUser = {
  id: string
  roles: RoleName[]
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
