import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search, ClipboardCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { sectionLabels } from '@/utils/stats';
import type { Franchisee } from '@/types';

type FilterKey = 'all' | 'pending' | 'verified' | 'rejected';

const filterConfig: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
];

function hasSectionStatus(f: Franchisee, status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED'): boolean {
  return f.sections.some((s) => s.status === status);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ReviewQueue() {
  const { franchisees, franchiseesLoading: loading } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterKey) ?? 'all';
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [search, setSearch] = useState('');
  const data = franchisees;

  const filtered = useMemo(() => {
    let result = data;
    if (filter === 'pending') result = result.filter((f) => hasSectionStatus(f, 'SUBMITTED'));
    else if (filter === 'verified') result = result.filter((f) => hasSectionStatus(f, 'VERIFIED'));
    else if (filter === 'rejected') result = result.filter((f) => hasSectionStatus(f, 'REJECTED'));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.pan.toLowerCase().includes(q) || f.id.includes(q));
    }
    return result;
  }, [data, filter, search]);

  const handleFilterChange = (key: FilterKey) => {
    setFilter(key);
    setSearchParams(key === 'all' ? {} : { filter: key });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Review Queue</h1>
        <p className="text-sm text-ink-secondary mt-1">
          Review and verify franchisee onboarding sections
        </p>
      </div>

      {/* Filter pills + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filterConfig.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-gradient-to-r from-brand-600 to-brand-400 text-white shadow-card'
                  : 'bg-white text-ink-secondary border border-brand-100 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-secondary/50" />
          <Input
            placeholder="Search by PAN or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No franchisees found"
            message={
              filter === 'all'
                ? 'No franchisees match your search. Try a different query.'
                : `No franchisees with ${filter} sections. Try a different filter.`
            }
            icon={<ClipboardCheck className="h-8 w-8" />}
            action={
              filter !== 'all' ? (
                <Button variant="secondary" onClick={() => handleFilterChange('all')}>
                  Clear filter
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-100 bg-surface-subtle/50">
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-6 py-3">
                      Franchisee
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Franchisee Info
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Relations
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Firms
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Salons
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Overall
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Submitted
                    </th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => navigate(`/franchisee/${f.id}`)}
                      className="border-b border-brand-50 last:border-0 cursor-pointer hover:bg-brand-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar initials={getInitials(f.pan || f.id)} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                              Franchisee #{f.id}
                            </p>
                            <p className="text-xs text-ink-secondary">
                              {f.franchiseeType === 'INDIVIDUAL' ? 'Individual' : 'Company'} · {f.pan || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      {(['FRANCHISEE_INFO', 'RELATIONS', 'FIRMS', 'SALONS'] as const).map((sec) => {
                        const section = f.sections.find((s) => s.section === sec);
                        return (
                          <td key={sec} className="px-3 py-4">
                            {section && <Badge kind={section.status} />}
                          </td>
                        );
                      })}
                      <td className="px-3 py-4">
                        <Badge kind={f.overallStatus === 'ONBOARDED' ? 'ONBOARDED' : 'INCOMPLETE'} />
                      </td>
                      <td className="px-3 py-4 text-sm text-ink-secondary whitespace-nowrap">
                        {formatDate(f.createdAt)}
                      </td>
                      <td className="px-3 py-4">
                        <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-brand-50">
              {filtered.map((f) => (
                <div
                  key={f.id}
                  onClick={() => navigate(`/franchisee/${f.id}`)}
                  className="p-4 cursor-pointer hover:bg-brand-50/50 transition-colors active:bg-brand-50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar initials={getInitials(f.pan || f.id)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">Franchisee #{f.id}</p>
                      <p className="text-xs text-ink-secondary truncate">
                        {f.franchiseeType === 'INDIVIDUAL' ? 'Individual' : 'Company'} · {formatDate(f.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-secondary/30" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['FRANCHISEE_INFO', 'RELATIONS', 'FIRMS', 'SALONS'] as const).map((sec) => {
                      const section = f.sections.find((s) => s.section === sec);
                      return section ? (
                        <span key={sec} className="inline-flex items-center gap-1">
                          <span className="text-[10px] text-ink-secondary">{sectionLabels[sec]}</span>
                          <Badge kind={section.status} />
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
