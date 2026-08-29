import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, ChevronRight, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Salon, Firm, Franchisee } from '@/types';

interface SalonRow extends Salon {
  firmLegalName: string;
  firmId: string;
  ownerName: string;
}

export function SalonManagement() {
  const { franchisees, franchiseesLoading: loading } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const data: SalonRow[] = useMemo(
    () =>
      franchisees.flatMap((f: Franchisee) =>
        f.firms.flatMap((firm: Firm) =>
          firm.salons.map((sal: Salon) => ({
            ...sal,
            firmLegalName: firm.legalName,
            firmId: firm.id,
            ownerName: `Franchisee #${f.id}`,
          })),
        ),
      ),
    [franchisees],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (s) =>
        s.salonName.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.firmLegalName.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Salon Management</h1>
        <p className="text-sm text-ink-secondary mt-1">
          View and manage all salons across firms
        </p>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-secondary/50" />
        <Input
          placeholder="Search by name, address, firm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden">
        {loading || !data ? (
          <SkeletonTable rows={6} />
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
                      City
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Firm
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
                      <td className="px-3 py-4 text-sm text-ink-secondary">{sal.city || '—'}</td>
                      <td className="px-3 py-4 text-sm text-ink">{sal.firmLegalName}</td>
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
                      <p className="text-xs text-ink-secondary truncate">{sal.city || '—'} · {sal.firmLegalName}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-secondary/30" />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-ink-secondary truncate flex-1 pr-2">{sal.address || '—'}</p>
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
