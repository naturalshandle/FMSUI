import { chromium, type FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import { ROLE_CREDENTIALS, storageStatePath, type RoleName } from './helpers/env';
import { login } from './helpers/auth';

dotenv.config({ path: '.env.test' });

/**
 * Logs in once per available role (including running the MFA dance where needed)
 * and persists the session so individual spec files can `test.use({ storageState:
 * storageStatePath(role) })` instead of re-authenticating per test. Works because
 * the app's access token lives only in memory (never localStorage) — what actually
 * needs to survive here is the refresh token, and the app re-derives a fresh access
 * token from it via /auth/refresh on every page load regardless.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:5173';
  const browser = await chromium.launch();

  for (const role of Object.keys(ROLE_CREDENTIALS) as RoleName[]) {
    const creds = ROLE_CREDENTIALS[role];
    if (!creds) {
      console.log(`[global-setup] Skipping ${role} — no credentials in .env.test.`);
      continue;
    }
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    try {
      const outcome = await login(page, creds);
      console.log(`[global-setup] ${role} logged in (${outcome.kind}).`);
      await context.storageState({ path: storageStatePath(role) });
    } catch (err) {
      console.error(`[global-setup] ${role} login failed — tests using this role's storageState will fail: ${err}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}
