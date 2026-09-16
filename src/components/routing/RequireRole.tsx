import { type ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import { NotAuthorized } from '@/pages/NotAuthorized';

interface RequireRoleProps {
  roles: readonly string[];
  children: ReactNode;
}

/** Route-level role guard, layered inside RequireAuth (App.tsx). Closes the gap
 * where previously only AppLayout's nav-item filtering hid links — a direct URL
 * visit by an unauthorized role now hits a visible "not authorized" page instead
 * of silently succeeding. */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { currentUser } = useApp();
  const allowed = currentUser?.roles?.some((r) => roles.includes(r)) ?? false;
  if (!allowed) return <NotAuthorized />;
  return <>{children}</>;
}
