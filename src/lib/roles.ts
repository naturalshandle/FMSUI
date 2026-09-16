/** Single source of truth for role-name literals used throughout the app. */

export const ADMIN_ROLES = ['SUPER_ADMIN', 'CORPORATE_ADMIN'] as const;
export const FIELD_ROLES = ['STATE_HEAD', 'REGIONAL_MANAGER', 'CLUSTER_MANAGER'] as const;
export const STAFF_ROLES = [...ADMIN_ROLES, ...FIELD_ROLES] as const;

export type Role = (typeof STAFF_ROLES)[number] | 'FRANCHISEE';

export function hasAnyRole(userRoles: string[] | undefined, allowed: readonly string[]): boolean {
  if (!userRoles) return false;
  return userRoles.some((r) => allowed.includes(r));
}

export function isAdmin(userRoles: string[] | undefined): boolean {
  return hasAnyRole(userRoles, ADMIN_ROLES);
}

export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CORPORATE_ADMIN: 'Corporate Admin',
  STATE_HEAD: 'State Head',
  REGIONAL_MANAGER: 'Regional Manager',
  CLUSTER_MANAGER: 'Cluster Manager',
  FRANCHISEE: 'Franchisee',
};
