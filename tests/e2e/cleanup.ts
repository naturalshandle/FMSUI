/**
 * Test-data cleanup for the Playwright E2E suite. Run with `npm run test:e2e:cleanup`.
 *
 * IMPORTANT LIMITATION, read before relying on this: this can only clean up
 * abandonable/deletable data:
 *   - Franchise-creation DRAFTS still IN_PROGRESS (never finalized) → abandoned via
 *     DELETE /franchise-creation/{id}.
 *   - Official records created for link-user testing → deleted via
 *     DELETE /admin/officials/{id}.
 *
 * It CANNOT remove finalized Franchisee/Firm/Salon/Agreement records — no delete
 * endpoint exists for any of those in this API (confirmed by grepping every
 * src/lib/*Api.ts file; only Documents, Firm-owner removal, Officials, and
 * in-progress drafts are deletable). Running the full wizard E2E test's finalize
 * step therefore PERMANENTLY adds a real Franchisee/Firm/Salon/Agreement to
 * whichever DB it runs against, every single run, with no automated way to remove
 * it again. This script instead just REPORTS those so a human (or a future backend
 * delete endpoint) can deal with them — it does not pretend to clean them up.
 *
 * This is a standalone Node script (run via tsx), not part of the Vite app bundle,
 * so it talks to the backend directly with plain fetch rather than importing
 * src/lib/api.ts (which relies on import.meta.env / browser-only token storage).
 */
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const API_BASE = (process.env.E2E_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const TEST_PREFIX = '[PLAYWRIGHT TEST]';

const email = process.env.E2E_SUPER_ADMIN_EMAIL;
const password = process.env.E2E_SUPER_ADMIN_PASSWORD;
const totpSecret = process.env.E2E_SUPER_ADMIN_TOTP_SECRET;

async function api<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data as T;
}

async function login(): Promise<string> {
  if (!email || !password) {
    throw new Error('Set E2E_SUPER_ADMIN_EMAIL / E2E_SUPER_ADMIN_PASSWORD in .env.test to run cleanup.');
  }
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(data)}`);
  if (!data.mfaRequired) return data.accessToken;

  if (!totpSecret) {
    throw new Error(
      'Super Admin login requires MFA and E2E_SUPER_ADMIN_TOTP_SECRET is not set in .env.test — this script ' +
        'cannot scrape a QR code like the Playwright browser tests do, so a known secret is required here.',
    );
  }
  const { generateSync } = await import('otplib');
  const verifyRes = await fetch(`${API_BASE}/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfaToken: data.mfaToken, code: generateSync({ secret: totpSecret }) }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(`MFA verify failed: ${JSON.stringify(verifyData)}`);
  return verifyData.accessToken;
}

async function cleanupDrafts(token: string) {
  const drafts = await api<any[]>('/franchise-creation', token);
  let abandoned = 0;
  for (const d of drafts) {
    if (d.status !== 'IN_PROGRESS') continue;
    const names = [
      ...(d.franchiseeOwners ?? []).map((o: any) => o.name),
      d.firmData?.legalName,
      d.salonData?.name,
    ].filter(Boolean);
    if (!names.some((n: string) => n.startsWith(TEST_PREFIX))) continue;
    await api(`/franchise-creation/${d.id}`, token, { method: 'DELETE' });
    console.log(`  abandoned draft #${d.id} (${names.join(', ')})`);
    abandoned++;
  }
  console.log(`Drafts abandoned: ${abandoned}`);
}

async function cleanupOfficials(token: string) {
  let page = 0;
  let deleted = 0;
  for (;;) {
    const result = await api<{ content: any[]; totalPages: number }>(`/officials?page=${page}&size=100`, token);
    for (const o of result.content) {
      if (!String(o.name ?? '').startsWith(TEST_PREFIX)) continue;
      await api(`/admin/officials/${o.id}`, token, { method: 'DELETE' });
      console.log(`  deleted official #${o.id} (${o.name})`);
      deleted++;
    }
    page++;
    if (page >= result.totalPages) break;
  }
  console.log(`Officials deleted: ${deleted}`);
}

async function reportUndeletableRecords(token: string) {
  const [franchisees, firms, salons] = await Promise.all([
    api<{ content: any[] }>(`/franchisees?search=${encodeURIComponent(TEST_PREFIX)}&size=100`, token),
    api<{ content: any[] }>(`/firms?search=${encodeURIComponent(TEST_PREFIX)}&size=100`, token),
    api<{ content: any[] }>(`/salons?search=${encodeURIComponent(TEST_PREFIX)}&size=100`, token),
  ]);

  const total = franchisees.content.length + firms.content.length + salons.content.length;
  if (total === 0) {
    console.log('No finalized test records found (nothing to report).');
    return;
  }

  console.log(`\n⚠ ${total} FINALIZED test record(s) exist with no delete endpoint — manual/backend cleanup needed:`);
  for (const f of franchisees.content) console.log(`  Franchisee #${f.id}: ${f.name}`);
  for (const f of firms.content) console.log(`  Firm #${f.id}: ${f.legalName}`);
  for (const s of salons.content) console.log(`  Salon #${s.id}: ${s.name} (code ${s.code})`);
}

async function main() {
  console.log('Logging in as Super Admin...');
  const token = await login();

  console.log('\nCleaning up in-progress drafts...');
  await cleanupDrafts(token);

  console.log('\nCleaning up test Officials...');
  await cleanupOfficials(token);

  console.log('\nChecking for finalized records that cannot be auto-deleted...');
  await reportUndeletableRecords(token);
}

main().catch((err) => {
  console.error('Cleanup failed:', err.message ?? err);
  process.exit(1);
});
