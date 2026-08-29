import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, ChevronRight, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { listSalonsAdmin } from '@/lib/salonsApi';
import { ApiError } from '@/lib/api';
import type { Salon } from '@/types';

export function SalonManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [region, setRegion] = useState('');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSalonsAdmin({ operationalStatus: status || undefined, region: region || undefined, size: 100 })
      .then((page) => {
        if (!cancelled) setSalons(page.content);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load salons.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, region]);

  const filtered = salons.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.salonName.toLowerCase().includes(q) || (s.address ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Salon Management</h1>
        <p className="text-sm text-ink-secondary mt-1">
          View and manage all salons across firms
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-secondary/50" />
          <Input placeholder="Search by name, address..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-48">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="UNDER_RENOVATION">Under Renovation</option>
          <option value="CLOSED">Closed</option>
        </Select>
        <Input placeholder="Region" value={region} onChange={(e) => setRegion(e.target.value)} className="w-full sm:w-40" />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <EmptyState title="Couldn't load salons" message={error} icon={<Scissors className="h-8 w-8" />} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No salons found"
            message="No salons match your search. Try a different query."
            icon={<Scissors className="h-8 w-8" />}
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-100 bg-surface-subtle/50">
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-6 py-3">
                      Salon
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Region / State
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Status
                    </th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sal) => (
                    <tr
                      key={sal.id}
                      onClick={() => navigate(`/salon/${sal.id}`)}
                      className="border-b border-brand-50 last:border-0 cursor-pointer hover:bg-brand-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <Scissors className="h-4.5 w-4.5" />
                          </div>
                          <span className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                            {sal.salonName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-ink-secondary">
                        {[sal.region, sal.state].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="px-3 py-4">
                        {sal.operationalStatus ? (
                          <Badge kind="DRAFT" label={sal.operationalStatus} />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-brand-50">
              {filtered.map((sal) => (
                <div
                  key={sal.id}
                  onClick={() => navigate(`/salon/${sal.id}`)}
                  className="p-4 cursor-pointer hover:bg-brand-50/50 transition-colors active:bg-brand-50"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Scissors className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{sal.salonName}</p>
                      <p className="text-xs text-ink-secondary truncate">
                        {[sal.region, sal.state].filter(Boolean).join(' / ') || '—'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-secondary/30" />
                  </div>
                  <p className="text-xs text-ink-secondary truncate">{sal.address || '—'}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
