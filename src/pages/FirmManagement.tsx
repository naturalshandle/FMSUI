import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePagedList } from '@/lib/pagination';
import { searchFirms } from '@/lib/firmsApi';
import type { CompanyType, Firm } from '@/types';

const companyTypeLabels: Record<string, string> = {
  PROPRIETORSHIP: 'Proprietorship',
  PARTNERSHIP: 'Partnership',
  PRIVATE_LIMITED: 'Private Limited',
  LLP: 'LLP',
};

const knownCompanyTypes = Object.keys(companyTypeLabels) as CompanyType[];

export function FirmManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [companyType, setCompanyType] = useState('');

  const {
    content: firms,
    page,
    setPage,
    totalElements,
    totalPages,
    loading,
    error,
  } = usePagedList(
    (p, size) => searchFirms({ companyType: companyType || undefined, search: search.trim() || undefined, page: p, size }),
    [search, companyType],
  );

  const primaryOwnerLabel = (firm: Firm) => {
    const primary = firm.owners.find((o) => o.isPrimary) ?? firm.owners[0];
    if (!primary) return '—';
    return primary.franchiseeName ?? `Franchisee #${primary.franchiseeId}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Company Directory</h1>
        <p className="text-sm text-ink-secondary mt-1">
          View and manage all firms (companies) across franchisees
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-secondary/50" />
          <Input
            placeholder="Search by firm name, GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="w-full sm:w-56">
          <option value="">All company types</option>
          {knownCompanyTypes.map((value) => (
            <option key={value} value={value}>
              {companyTypeLabels[value]}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <EmptyState title="Couldn't load companies" message={error} icon={<Building2 className="h-8 w-8" />} />
        ) : firms.length === 0 ? (
          <EmptyState
            title={search.trim() || companyType ? 'No companies found' : 'No firms yet'}
            message={
              search.trim() || companyType
                ? 'No firms match your search. Try a different query.'
                : 'Firms are created via the Franchise Creation wizard.'
            }
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
                      Primary Owner
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Owners
                    </th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {firms.map((firm) => (
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
                        <Badge kind="DRAFT" label={companyTypeLabels[firm.companyType] ?? firm.companyType} />
                      </td>
                      <td className="px-3 py-4 text-sm text-ink-secondary font-mono">{firm.gstNumber || '—'}</td>
                      <td className="px-3 py-4 text-sm text-ink">{primaryOwnerLabel(firm)}</td>
                      <td className="px-3 py-4 text-sm text-ink-secondary">{firm.owners.length}</td>
                      <td className="px-3 py-4">
                        <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-brand-50">
              {firms.map((firm) => (
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
                      <p className="text-xs text-ink-secondary truncate">
                        {companyTypeLabels[firm.companyType] ?? firm.companyType} · {primaryOwnerLabel(firm)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-secondary/30" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-secondary">
                    <span className="font-mono">{firm.gstNumber || '—'}</span>
                    <span>·</span>
                    <span>{firm.owners.length} owner(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {firms.length > 0 && (
        <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} itemLabel="firm" />
      )}
    </div>
  );
}
