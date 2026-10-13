/**
 * API for Playwright. Always uses the in-memory user store and seeds one user per role.
 * Password for every seed: password
 */
process.env.NODE_ENV = 'test'
process.env.PORT = '3001'
process.env.TRUST_PROXY = 'false'
process.env.LOG_LEVEL = 'silent'
process.env.CORS_ORIGINS = 'http://127.0.0.1:5173,http://localhost:5173'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters'
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_SERVICE_ROLE_KEY
delete process.env.SUPABASE_ANON_KEY
delete process.env.DATABASE_URL

const { createApp } = await import('../src/app.js')
const { loadConfig } = await import('../src/config/index.js')
const { createAuthRepository } = await import('../src/modules/auth/auth.repository.js')
const { hashPassword } = await import('../src/modules/auth/auth.tokens.js')

const seeds = [
  { email: 'admin@original-iq.com', role: 'admin', firstName: 'Admin', lastName: 'User' },
  {
    email: 'coordinator@original-iq.com',
    role: 'coordinator',
    firstName: 'Coordinator',
    lastName: 'User',
  },
  { email: 'tutor@original-iq.com', role: 'tutor', firstName: 'Tutor', lastName: 'User' },
  { email: 'client@original-iq.com', role: 'client', firstName: 'Client', lastName: 'User' },
] as const

const config = loadConfig()
const repo = createAuthRepository(config)
const passwordHash = await hashPassword('password')

for (const user of seeds) {
  const existing = await repo.findByEmail(user.email)
  if (existing) continue
  await repo.createUserWithProfile({
    email: user.email,
    passwordHash,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  })
}

const app = createApp({ config })
app.listen(config.port, '127.0.0.1', () => {
  console.log(`e2e api listening on ${config.port}`)
})
