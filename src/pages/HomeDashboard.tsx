import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { computeStats, sectionLabels, SECTION_NAMES, SECTION_STATES } from '@/utils/stats';
import type { SectionName, SectionState } from '@/types';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CORPORATE_ADMIN: 'Corporate Admin',
  STATE_HEAD: 'State Head',
  REGIONAL_MANAGER: 'Regional Manager',
  CLUSTER_MANAGER: 'Cluster Manager',
};

const stateColors: Record<SectionState, string> = {
  VERIFIED: 'bg-status-verified',
  SUBMITTED: 'bg-status-pending',
  REJECTED: 'bg-status-rejected',
  DRAFT: 'bg-status-draft',
};

function displayName(email?: string): string {
  return email ? email.split('@')[0] : '';
}

export function HomeDashboard() {
  const { currentUser, franchisees, franchiseesLoading } = useApp();
  const navigate = useNavigate();
  const loading = franchiseesLoading;
  const [stats, setStats] = useState<ReturnType<typeof computeStats> | null>(null);

  useEffect(() => {
    setStats(computeStats(franchisees));
  }, [franchisees]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'Total Franchisees',
        value: stats.total,
        icon: Users,
        color: 'from-brand-600 to-brand-400',
        filter: 'all' as const,
      },
      {
        label: 'Pending Review',
        value: stats.pendingReview,
        icon: Clock,
        color: 'from-amber-500 to-amber-400',
        filter: 'pending' as const,
      },
      {
        label: 'Onboarded',
        value: stats.onboarded,
        icon: CheckCircle2,
        color: 'from-green-600 to-green-500',
        filter: 'verified' as const,
      },
      {
        label: 'Needs Franchisee Action',
        value: stats.needsAction,
        icon: AlertTriangle,
        color: 'from-red-500 to-red-400',
        filter: 'rejected' as const,
      },
    ];
  }, [stats]);

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
        <div className="flex gap-3">
          <Button onClick={() => navigate('/admin/franchisees/new')} size="md" variant="secondary">
            <UserPlus className="h-4 w-4" />
            Add Franchisee
          </Button>
          <Button onClick={() => navigate('/review')} size="md">
            <ClipboardCheck className="h-4 w-4" />
            Go to Review Queue
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      {loading || !stats ? (
        <SkeletonCards count={4} />
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

      {/* Section breakdown */}
      {!loading && stats && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-1">Section Status Breakdown</h2>
          <p className="text-sm text-ink-secondary mb-5">
            Verification progress across the four onboarding sections
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-100">
                  <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider pb-3 pr-4">
                    Section
                  </th>
                  {SECTION_STATES.map((st) => (
                    <th key={st} className="text-center text-xs font-semibold text-ink-secondary uppercase tracking-wider pb-3 px-2">
                      {st}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SECTION_NAMES.map((sec) => (
                  <tr key={sec} className="border-b border-brand-50 last:border-0">
                    <td className="py-3.5 pr-4 text-sm font-medium text-ink">{sectionLabels[sec]}</td>
                    {SECTION_STATES.map((st) => (
                      <td key={st} className="text-center py-3.5 px-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${stateColors[st]}`} />
                          <span className="text-sm font-semibold text-ink">
                            {stats.sectionBreakdown[sec as SectionName][st]}
                          </span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Firm/Salon totals */}
      {!loading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm text-ink-secondary">Total Firms</span>
            </div>
            <p className="text-2xl font-bold text-ink">{stats.totalFirms}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Scissors className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm text-ink-secondary">Total Salons</span>
            </div>
            <p className="text-2xl font-bold text-ink">{stats.totalSalons}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-status-verified">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm text-ink-secondary">Onboarded Franchisees</span>
            </div>
            <p className="text-2xl font-bold text-ink">{stats.onboarded}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
