import { defineConfig, devices } from '@playwright/test'

/**
 * Web E2E — starts Vite preview/dev via webServer.
 * Run: npm run test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_CHANNEL
          ? { channel: process.env.PLAYWRIGHT_CHANNEL as 'chrome' }
          : {}),
      },
    },
  ],
  webServer: [
    {
      command: 'npm run e2e:server',
      cwd: '../backend',
      url: 'http://127.0.0.1:3001/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:3001/api/v1',
      },
    },
  ],
})
