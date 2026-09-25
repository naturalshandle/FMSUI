import { StatusBadge } from '@/components/ui/StatusBadge';
import { getExpiryInfo } from '@/lib/agreementExpiry';
import type { Agreement } from '@/types';

/** "Expired" / "Expires today" / "Expires in N days" tag for ACTIVE agreements within
 * the 30-day reminder window. Renders nothing otherwise. Always shown alongside the
 * status badge, never in place of it. */
export function AgreementExpiryChip({ agreement }: { agreement: Pick<Agreement, 'status' | 'isExpired' | 'validTill'> }) {
  const info = getExpiryInfo(agreement);
  if (!info) return null;
  return <StatusBadge bucket={info.tone === 'red' ? 'negative' : 'pending'} label={info.label} />;
}
