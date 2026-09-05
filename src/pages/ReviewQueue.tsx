import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Search, ClipboardCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { Input, Select } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { listFranchiseesAdmin, ApiError } from '@/lib/api';
import type { FranchiseeSummary } from '@/types';

type FilterKey = 'all' | 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

const filterConfig: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'SUBMITTED', label: 'Pending' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
];

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 20;

export function ReviewQueue() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterKey) ?? 'all';
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<FranchiseeSummary[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listFranchiseesAdmin({
      status: filter === 'all' ? undefined : filter,
      source: source || undefined,
      search: search.trim() || undefined,
      sortBy: 'fullName',
      direction: 'ASC',
      page,
      size: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setRows(result.content);
        setTotalElements(result.totalElements);
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : 'Failed to load franchisees.';
        setError(message);
        showToast('error', message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, source, search, page]);

  const handleFilterChange = (key: FilterKey) => {
    setFilter(key);
    setPage(0);
    setSearchParams(key === 'all' ? {} : { filter: key });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Franchisee Directory</h1>
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
        <div className="flex gap-3 w-full sm:w-auto">
          <Select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(0);
            }}
            className="w-40"
          >
            <option value="">All sources</option>
            <option value="SELF_SERVICE">Self-service</option>
            <option value="ADMIN">Admin-entered</option>
          </Select>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-secondary/50" />
            <Input
              placeholder="Search by name or PAN..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <EmptyState title="Couldn't load franchisees" message={error} icon={<ClipboardCheck className="h-8 w-8" />} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No franchisees found"
            message={
              filter === 'all'
                ? 'No franchisees match your search. Try a different query.'
                : `No franchisees with ${filter} status. Try a different filter.`
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
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Source
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Firms
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Salons
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Created
                    </th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => navigate(`/franchisee/${f.id}`)}
                      className="border-b border-brand-50 last:border-0 cursor-pointer hover:bg-brand-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar initials={getInitials(f.fullName || f.id)} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                              {f.fullName || `Franchisee #${f.id}`}
                            </p>
                            <p className="text-xs text-ink-secondary">
                              {f.franchiseeType === 'INDIVIDUAL' ? 'Individual' : f.franchiseeType === 'COMPANY' ? 'Company' : '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        {f.overallStatus ? <Badge kind={f.overallStatus} /> : '—'}
                      </td>
                      <td className="px-3 py-4 text-sm text-ink-secondary">{f.source ?? '—'}</td>
                      <td className="px-3 py-4 text-sm text-ink-secondary">{f.firmCount ?? '—'}</td>
                      <td className="px-3 py-4 text-sm text-ink-secondary">{f.salonCount ?? '—'}</td>
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
              {rows.map((f) => (
                <div
                  key={f.id}
                  onClick={() => navigate(`/franchisee/${f.id}`)}
                  className="p-4 cursor-pointer hover:bg-brand-50/50 transition-colors active:bg-brand-50"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar initials={getInitials(f.fullName || f.id)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{f.fullName || `Franchisee #${f.id}`}</p>
                      <p className="text-xs text-ink-secondary truncate">{formatDate(f.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-secondary/30" />
                  </div>
                  {f.overallStatus && <Badge kind={f.overallStatus} />}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-brand-50">
              <p className="text-xs text-ink-secondary">
                {totalElements} franchisee(s) · page {page + 1} of {Math.max(totalPages, 1)}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
