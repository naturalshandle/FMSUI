import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Firm, Franchisee } from '@/types';

const firmTypeLabels: Record<string, string> = {
  PROPRIETORSHIP: 'Proprietorship',
  PRIVATE_LIMITED: 'Private Limited',
  LLP: 'LLP',
};

interface FirmRow extends Firm {
  ownerName: string;
  ownerId: string;
}

export function FirmManagement() {
  const { franchisees, franchiseesLoading: loading } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const data: FirmRow[] = useMemo(
    () =>
      franchisees.flatMap((f: Franchisee) =>
        f.firms.map((firm: Firm) => ({
          ...firm,
          ownerName: `Franchisee #${f.id}`,
          ownerId: f.id,
        })),
      ),
    [franchisees],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (f) =>
        f.legalName.toLowerCase().includes(q) ||
        f.gstNumber.toLowerCase().includes(q) ||
        f.ownerName.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Firm Management</h1>
        <p className="text-sm text-ink-secondary mt-1">
          View and manage all firms across franchisees
        </p>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-secondary/50" />
        <Input
          placeholder="Search by firm name, GST, owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No firms found"
            message="No firms match your search. Try a different query."
            icon={<Building2 className="h-8 w-8" />}
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-100 bg-surface-subtle/50">
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-6 py-3">
                      Legal Name
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Type
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      GST
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Owner
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Salons
                    </th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((firm) => (
                    <tr
                      key={firm.id}
                      onClick={() => navigate(`/firm/${firm.id}`)}
                      className="border-b border-brand-50 last:border-0 cursor-pointer hover:bg-brand-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <Building2 className="h-4.5 w-4.5" />
                          </div>
                          <span className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                            {firm.legalName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <Badge kind="DRAFT" label={firmTypeLabels[firm.firmType]} />
                      </td>
                      <td className="px-3 py-4 text-sm text-ink-secondary font-mono">{firm.gstNumber}</td>
                      <td className="px-3 py-4 text-sm text-ink">{firm.ownerName}</td>
                      <td className="px-3 py-4 text-sm text-ink-secondary">{firm.salons.length}</td>
                      <td className="px-3 py-4">
                        <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-brand-50">
              {filtered.map((firm) => (
                <div
                  key={firm.id}
                  onClick={() => navigate(`/firm/${firm.id}`)}
                  className="p-4 cursor-pointer hover:bg-brand-50/50 transition-colors active:bg-brand-50"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Building2 className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{firm.legalName}</p>
                      <p className="text-xs text-ink-secondary truncate">{firmTypeLabels[firm.firmType]} · {firm.ownerName}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-secondary/30" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-secondary">
                    <span className="font-mono">{firm.gstNumber}</span>
                    <span>·</span>
                    <span>{firm.salons.length} salon(s)</span>
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
