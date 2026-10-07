import type { DomainDefinition } from '../_shared/domain-definition.js'

export const usersDomain = {
  name: 'users',
  responsibility:
    'Owns user identity profile and role membership used across the app. Does not issue tokens (auth).',
  entities: [
    {
      name: 'User',
      description: 'Account: email, password hash, role, status.',
    },
    {
      name: 'Profile',
      description: 'Display/contact fields linked 1:1 to User.',
    },
  ],
  valueObjects: [
    {
      name: 'UserRole',
      description: 'SUPER | ADMIN | TUTOR | STUDENT — public register defaults to STUDENT.',
    },
    {
      name: 'EmailAddress',
      description: 'Normalized unique email.',
    },
  ],
  useCases: ['listUsers', 'getUserById', 'createUser', 'updateUser', 'deactivateUser'],
  relationships: ['Referenced by auth (userId) and future tutoring domains (sessions, courses).'],
  externalAccessRules: [
    'Other modules read users only via public users service (e.g. getById), never user.repository.',
    'Role changes are authorized in users service — UI checks are not enough.',
  ],
} as const satisfies DomainDefinition
