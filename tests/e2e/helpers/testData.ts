/** Every record a test creates in the real local dev DB must carry this prefix so
 * `npm run test:e2e:cleanup` (and a human skimming the DB) can find it unambiguously.
 * See tests/e2e/cleanup.ts for what that script can and can't remove. */
export const TEST_PREFIX = '[PLAYWRIGHT TEST]';

let counter = 0;

/** Appends a run-local counter + timestamp so repeated runs never collide on
 * unique-constrained fields (GST number, salon code, etc.) within the same run. */
export function testTag(): string {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

export function testName(label: string): string {
  return `${TEST_PREFIX} ${label} ${testTag()}`;
}

/** Digits-only tag for fields that look like codes/numbers (GST number, salon
 * code, FP code) — some of these may be format-validated server-side, and the
 * example seed data seen in this app uses plain digit strings, not free text. */
export function testDigits(): string {
  counter += 1;
  return `${Date.now()}${counter}`.slice(-10);
}
