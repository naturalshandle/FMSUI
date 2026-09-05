import type { SectionState } from '@/types';

type BadgeKind = SectionState | 'ONBOARDED';

const badgeConfig: Record<BadgeKind, { label: string; classes: string; dot: string }> = {
  VERIFIED: { label: 'Verified', classes: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-status-verified' },
  SUBMITTED: { label: 'Submitted', classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-status-pending' },
  REJECTED: { label: 'Rejected', classes: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-status-rejected' },
  DRAFT: { label: 'Draft', classes: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-status-draft' },
  ONBOARDED: { label: 'Onboarded', classes: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-status-verified' },
};

interface BadgeProps {
  kind: BadgeKind;
  label?: string;
  size?: 'sm' | 'md';
}

export function Badge({ kind, label, size = 'sm' }: BadgeProps) {
  const config = badgeConfig[kind];
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.classes} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label ?? config.label}
    </span>
  );
}
