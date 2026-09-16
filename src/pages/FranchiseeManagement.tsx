import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePagedList } from '@/lib/pagination';
import { searchFranchisees, looksLikePan } from '@/lib/franchiseesApi';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FranchiseeManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const isPanSearch = looksLikePan(search);

  const {
    content: rows,
    page,
    setPage,
    totalElements,
    totalPages,
    loading,
    error,
  } = usePagedList((p, size) => searchFranchisees({ search: search.trim() || undefined, page: p, size }), [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Franchisees</h1>
        <p className="text-sm text-ink-secondary mt-1">Search by name, contact, or exact PAN</p>
      </div>

      <div className="relative w-full sm:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-secondary/50" />
        <Input
          placeholder="Search by name, contact, or exact PAN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      {isPanSearch && rows.length > 0 && (
        <p className="text-xs font-medium text-brand-700">Exact PAN match</p>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <EmptyState title="Couldn't load franchisees" message={error} icon={<Users className="h-8 w-8" />} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={search.trim() ? 'No franchisees match your search' : 'No franchisees yet'}
            message={search.trim() ? 'Try a different name, contact, or PAN.' : 'Franchisees are created via the Franchise Creation wizard.'}
            icon={<Users className="h-8 w-8" />}
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-100 bg-surface-subtle/50">
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-6 py-3">Name</th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">Contact</th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">Created</th>
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
                          <Avatar initials={getInitials(f.name || f.id)} size="sm" />
                          <p className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                            {f.name || `Franchisee #${f.id}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-ink-secondary">{f.contact || '—'}</td>
                      <td className="px-3 py-4 text-sm text-ink-secondary whitespace-nowrap">{formatDate(f.createdAt)}</td>
                      <td className="px-3 py-4">
                        <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-brand-50">
              {rows.map((f) => (
                <div
                  key={f.id}
                  onClick={() => navigate(`/franchisee/${f.id}`)}
                  className="p-4 cursor-pointer hover:bg-brand-50/50 transition-colors active:bg-brand-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar initials={getInitials(f.name || f.id)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{f.name || `Franchisee #${f.id}`}</p>
                      <p className="text-xs text-ink-secondary truncate">{f.contact || formatDate(f.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-secondary/30" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {!isPanSearch && rows.length > 0 && (
        <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} itemLabel="franchisee" />
      )}
    </div>
  );
}
