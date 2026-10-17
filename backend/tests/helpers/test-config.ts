import { type AppConfig, loadConfig } from '../../src/config/index.js'

export const TEST_JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters'
export const TEST_JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters'

/**
 * Build AppConfig for unit/integration tests.
 * Uses an isolated env object (not process.env) and always clears SUPABASE_*
 * so repository factories use in-memory stores only.
 */
export function loadTestConfig(overrides: Partial<NodeJS.ProcessEnv> = {}): AppConfig {
  return loadConfig({
    NODE_ENV: 'test',
    PORT: '3000',
    CORS_ORIGINS: 'http://localhost:5173',
    TRUST_PROXY: 'false',
    JWT_ACCESS_SECRET: TEST_JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: TEST_JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    ...overrides,
    SUPABASE_URL: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    SUPABASE_ANON_KEY: undefined,
  })
}
