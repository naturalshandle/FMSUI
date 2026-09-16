/**
 * Implements spec §0.4's shared status/badge color language. Every lifecycle
 * status in the app (Agreements, Royalty, Documents, Salon Audits, Franchise
 * Creation drafts) renders through this one component so colors stay consistent
 * — domain modules only need to supply a mapping function to one of these 6
 * semantic buckets, never invent their own color.
 */
export type StatusBucket = 'neutral' | 'pending' | 'positive' | 'negative' | 'closed' | 'computed';

const bucketConfig: Record<StatusBucket, { classes: string; dot: string }> = {
  neutral: { classes: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  pending: { classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-status-pending' },
  positive: { classes: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-status-verified' },
  negative: { classes: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-status-rejected' },
  closed: { classes: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
  computed: { classes: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
};

interface StatusBadgeProps {
  bucket: StatusBucket;
  label: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ bucket, label, size = 'sm' }: StatusBadgeProps) {
  const config = bucketConfig[bucket];
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.classes} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}
