import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Scissors,
  ArrowRight,
  ClipboardCheck,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getDashboard, ApiError } from '@/lib/api';
import type { DashboardData } from '@/types';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CORPORATE_ADMIN: 'Corporate Admin',
  STATE_HEAD: 'State Head',
  REGIONAL_MANAGER: 'Regional Manager',
  CLUSTER_MANAGER: 'Cluster Manager',
};

function displayName(email?: string): string {
  return email ? email.split('@')[0] : '';
}

/** GET /api/v1/admin/dashboard response shape is unverified — every field below is read
 * defensively with a fallback so the page renders regardless of the real field names. */
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

  const statCards = stats
    ? [
        {
          label: 'Total Franchisees',
          value: stats.totalFranchisees ?? '—',
          icon: Users,
          color: 'from-brand-600 to-brand-400',
          filter: 'all',
        },
        {
          label: 'Pending Review',
          value: stats.pendingReview ?? '—',
          icon: Clock,
          color: 'from-amber-500 to-amber-400',
          filter: 'SUBMITTED',
        },
        {
          label: 'Onboarded',
          value: stats.onboarded ?? '—',
          icon: CheckCircle2,
          color: 'from-green-600 to-green-500',
          filter: 'VERIFIED',
        },
        {
          label: 'Needs Franchisee Action',
          value: stats.needsAction ?? '—',
          icon: AlertTriangle,
          color: 'from-red-500 to-red-400',
          filter: 'REJECTED',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar initials={getInitials(displayName(currentUser?.email) || 'A U')} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-ink">
              Welcome back, {displayName(currentUser?.email)}
            </h1>
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
          <Button onClick={() => navigate('/admin/franchisees/new')} size="md" variant="secondary">
            <UserPlus className="h-4 w-4" />
            Add Franchisee
          </Button>
          <Button onClick={() => navigate('/review')} size="md">
            <ClipboardCheck className="h-4 w-4" />
            Go to Directory
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <SkeletonCards count={4} />
      ) : error ? (
        <Card className="p-6">
          <EmptyState title="Couldn't load dashboard stats" message={error} icon={<AlertTriangle className="h-8 w-8" />} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((card) => (
            <Card
              key={card.label}
              hover
              onClick={() => navigate(`/review?filter=${card.filter}`)}
              className="p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow-sm`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-ink-secondary/40" />
              </div>
              <p className="text-3xl font-bold text-ink leading-none">{card.value}</p>
              <p className="text-sm text-ink-secondary mt-1.5">{card.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Firm/Salon totals */}
      {!loading && !error && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm text-ink-secondary">Total Firms</span>
            </div>
            <p className="text-2xl font-bold text-ink">{stats.totalFirms ?? '—'}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Scissors className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm text-ink-secondary">Total Salons</span>
            </div>
            <p className="text-2xl font-bold text-ink">{stats.totalSalons ?? '—'}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm text-ink-secondary">Total Officials</span>
            </div>
            <p className="text-2xl font-bold text-ink">{stats.totalOfficials ?? '—'}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
