import { describe, expect, it } from 'vitest'

import { loadConfig } from '../../src/config/index.js'

const STRONG_ACCESS = 'a'.repeat(32)
const STRONG_REFRESH = 'b'.repeat(32)

function production(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://app.example.com',
    TRUST_PROXY: 'true',
    JWT_ACCESS_SECRET: STRONG_ACCESS,
    JWT_REFRESH_SECRET: STRONG_REFRESH,
    PAYMENT_GATEWAY_MODE: 'montypay',
    ...overrides,
  }
}

describe('config: deployed security guards', () => {
  it('accepts strong, distinct secrets behind a trusted proxy', () => {
    expect(() => loadConfig(production())).not.toThrow()
  })

  it.each([
    ['missing secrets', { JWT_ACCESS_SECRET: undefined }],
    ['short secrets', { JWT_ACCESS_SECRET: 'dev_access_secret_change_me' }],
    ['identical secrets', { JWT_REFRESH_SECRET: STRONG_ACCESS }],
    ['TRUST_PROXY off', { TRUST_PROXY: 'false' }],
  ])('refuses to boot production with %s', (_label, overrides) => {
    expect(() => loadConfig(production(overrides))).toThrow(/Invalid production configuration/)
  })

  it('applies the same rules to staging', () => {
    expect(() => loadConfig(production({ NODE_ENV: 'staging', TRUST_PROXY: 'false' }))).toThrow(
      /Invalid staging configuration/,
    )
  })

  it('does not enforce them in development', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET: 'short',
        JWT_REFRESH_SECRET: 'short',
      }),
    ).not.toThrow()
  })
})
