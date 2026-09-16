import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number; // 0-indexed
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({ page, totalPages, totalElements, onPageChange, itemLabel = 'item' }: PaginationProps) {
  if (totalElements === 0) return null;
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-xs text-ink-secondary">
        {totalElements} {itemLabel}
        {totalElements === 1 ? '' : 's'} &middot; page {page + 1} of {Math.max(totalPages, 1)}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= totalPages}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
