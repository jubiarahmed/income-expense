import { defineConfig, devices } from '@playwright/test';

// Smoke-test config. By default the tests hit the public production deployment so
// they can verify the live build end-to-end. Override with E2E_BASE_URL for staging
// or local runs (e.g. `E2E_BASE_URL=http://localhost:5173 npm run test:e2e`).
const baseURL = process.env.E2E_BASE_URL ?? 'https://expense-tracker-theta-sooty-18.vercel.app';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'line',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    actionTimeout: 10_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
