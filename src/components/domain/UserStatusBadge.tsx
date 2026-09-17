import { StatusBadge } from '@/components/ui/StatusBadge';
import type { UserAccountStatus } from '@/types';

/** Shared status badge for any screen showing a linked/created login's activation
 * state (Officials, Admin Users). PENDING_ACTIVATION means the user was emailed an
 * activation link but hasn't set a password yet. LOCKED/DISABLED aren't reachable
 * from these flows today but are handled as a neutral fallback rather than dropped. */
export function UserStatusBadge({ status }: { status?: UserAccountStatus | null }) {
  if (!status) return null;
  switch (status) {
    case 'PENDING_ACTIVATION':
      return <StatusBadge bucket="pending" label="Reset Password" />;
    case 'ACTIVE':
      return <StatusBadge bucket="positive" label="Activated" />;
    default:
      return <StatusBadge bucket="neutral" label={status} />;
  }
}
