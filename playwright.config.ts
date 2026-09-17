import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

/**
 * Local bug-catching config, not CI-grade: no retries (a flake should be visible,
 * not hidden by a green re-run), a single worker (tests share the real local dev
 * DB and login as the same handful of real accounts — parallel runs would race
 * each other), and a generous-but-not-infinite timeout for a dev server + real
 * backend rather than a tuned CI machine.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
