import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Scissors,
  FilePlus2,
  FileText,
  Percent,
  AlertTriangle,
  UserPlus,
  ShieldCheck,
  ClipboardCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { HomeMenu } from '@/components/domain/HomeMenu';
import { ExpiringAgreementsWidget } from '@/components/domain/ExpiringAgreementsWidget';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getDashboard } from '@/lib/dashboardApi';
import { ApiError } from '@/lib/api';
import { roleLabels, isAdmin } from '@/lib/roles';
import type { DashboardData } from '@/types';

function displayName(email?: string): string {
  return email ? email.split('@')[0] : '';
}

/** GET /api/v1/dashboard per spec §9 — unscoped, identical for every role. */
export function HomeDashboard() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar initials={getInitials(displayName(currentUser?.email) || 'A U')} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-ink">Welcome back, {displayName(currentUser?.email)}</h1>
            <p className="text-sm text-ink-secondary mt-0.5">
              {(currentUser?.roles ?? []).map((r) => roleLabels[r] ?? r).join(', ')} · Here's what needs your attention today
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/officials')} size="md" variant="secondary">
            <ShieldCheck className="h-4 w-4" />
            Officials
          </Button>
          <Button onClick={() => navigate('/franchise-creation')} size="md" variant="secondary">
            <UserPlus className="h-4 w-4" />
            Add Franchisee
          </Button>
          <Button onClick={() => navigate('/franchisees')} size="md">
            <ClipboardCheck className="h-4 w-4" />
            Go to Directory
          </Button>
          <HomeMenu />
        </div>
      </div>

      {loading ? (
        <SkeletonCards count={4} />
      ) : error ? (
        <Card className="p-6">
          <EmptyState title="Couldn't load dashboard stats" message={error} icon={<AlertTriangle className="h-8 w-8" />} />
        </Card>
      ) : stats ? (
        <>
          {stats.totalFranchisees === 0 && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-ink-secondary">
              Nothing here yet — get started by creating your first franchise.
            </div>
          )}

          {/* Top row counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard icon={Users} label="Total Franchisees" value={stats.totalFranchisees} onClick={() => navigate('/franchisees')} />
            <StatCard icon={Building2} label="Total Firms" value={stats.totalFirms} onClick={() => navigate('/firms')} />
            <StatCard icon={Scissors} label="Total Salons" value={stats.totalSalons} onClick={() => navigate('/salons')} />
            <StatCard
              icon={FilePlus2}
              label="Drafts In Progress"
              value={stats.franchiseCreationDraftsInProgress}
              onClick={() => navigate('/franchise-creation')}
            />
          </div>

          {/* Agreements breakdown */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Agreements</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Segment label="Active" value={stats.agreementsByStatus.active} tone="green" />
              <Segment label="Expired" value={stats.agreementsByStatus.expired} tone="orange" />
              <Segment label="Terminated" value={stats.agreementsByStatus.terminated} tone="red" />
              <Segment label="Superseded" value={stats.agreementsByStatus.superseded} tone="gray" />
            </div>
          </Card>

          {/* Admins receive the expiry reminders, so they get the actionable list. */}
          {isAdmin(currentUser?.roles) && <ExpiringAgreementsWidget expiredCount={stats.agreementsByStatus.expired} />}

          {/* Royalty breakdown */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Royalty Requests</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Segment
                label="Pending State Head"
                value={stats.royaltyRequestsByStatus.pendingStateHead}
                tone="amber"
                icon={Percent}
                onClick={() => navigate('/royalty-approvals')}
              />
              <Segment
                label="Pending Admin"
                value={stats.royaltyRequestsByStatus.pendingAdmin}
                tone="amber"
                icon={Percent}
                onClick={() => navigate('/royalty-approvals')}
              />
              <Segment label="Approved" value={stats.royaltyRequestsByStatus.approved} tone="green" />
              <Segment label="Rejected" value={stats.royaltyRequestsByStatus.rejected} tone="red" />
            </div>
          </Card>

          {/* Documents breakdown */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Documents</h2>
            <div className="grid grid-cols-3 gap-4">
              <Segment label="Pending" value={stats.documentsByVerificationStatus.pending} tone="amber" icon={FileText} />
              <Segment label="Verified" value={stats.documentsByVerificationStatus.verified} tone="green" icon={FileText} />
              <Segment label="Rejected" value={stats.documentsByVerificationStatus.rejected} tone="red" icon={FileText} />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <Card hover onClick={onClick} className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-sm mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-bold text-ink leading-none">{value}</p>
      <p className="text-sm text-ink-secondary mt-1.5">{label}</p>
    </Card>
  );
}

const toneClasses: Record<string, string> = {
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  orange: 'bg-orange-50 text-orange-700',
  gray: 'bg-gray-100 text-gray-600',
};

function Segment({
  label,
  value,
  tone,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number;
  tone: string;
  icon?: typeof Users;
  onClick?: () => void;
}) {
  const content = (
    <div className={`rounded-xl px-4 py-3 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
  if (!onClick) return content;
  return (
    <button onClick={onClick} className="text-left hover:opacity-80 transition-opacity">
      {content}
    </button>
  );
}
