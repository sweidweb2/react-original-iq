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
  ],
  valueObjects: [
    {
      name: 'UserRole',
      description: 'admin | coordinator | tutor | client — public register defaults to client.',
    },
    {
      name: 'EmailAddress',
      description: 'Normalized unique email.',
    },
  ],
  useCases: ['listUsers', 'getUserById', 'createUser', 'updateUser', 'deactivateUser'],
  relationships: ['Referenced by auth (userId) and tutoring domains (tasks, payments).'],
  externalAccessRules: [
    'Other modules read users only via public users service (e.g. getById), never user.repository.',
    'Role changes are authorized in users service — UI checks are not enough.',
  ],
} as const satisfies DomainDefinition
