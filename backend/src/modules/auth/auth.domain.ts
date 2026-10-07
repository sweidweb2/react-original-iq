import type { DomainDefinition } from '../_shared/domain-definition.js'

export const authDomain = {
  name: 'auth',
  responsibility:
    'Owns authentication lifecycle: credential verification, access/refresh tokens, logout, and token rotation/revocation. Does not own user profile data.',
  entities: [
    {
      name: 'RefreshToken',
      description:
        'TBD persisted refresh credential. Current implementation uses signed JWT refresh tokens only (no DB table yet).',
    },
  ],
  valueObjects: [
    {
      name: 'AccessTokenClaims',
      description: 'Short-lived JWT claims (sub, role, typ, exp).',
    },
    {
      name: 'PasswordHash',
      description: 'Hashed password material — never plaintext.',
    },
  ],
  useCases: ['register', 'login', 'refreshTokens', 'logout'],
  relationships: [
    'References User by userId (users module owns User profile).',
    'Issues tokens consumed by API authenticate middleware.',
  ],
  externalAccessRules: [
    'Other modules never read refresh-token tables directly.',
    'Call auth only through public auth service / HTTP auth routes.',
    'Password hashing and token secrets stay inside auth.',
  ],
} as const satisfies DomainDefinition
