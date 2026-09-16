import { request } from '@/lib/api';
import type { DashboardData } from '@/types';

/** GET /api/v1/dashboard — spec §9. Not under /admin; identical response for every
 * staff role and admin. No query params. */
export async function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>('/dashboard');
}
