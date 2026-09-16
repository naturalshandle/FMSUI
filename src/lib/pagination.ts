import { useCallback, useEffect, useState } from 'react';

/** Spring's standard Page<T> envelope — used identically by every true paginated
 * list endpoint (Salon/Agreement/Official/Franchisee/Firm). Do NOT use this for
 * Documents, Salon Audit history, or Royalty history/pending — those are plain
 * arrays per spec §0.5, never paginated. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export function usePagedList<T>(
  fetchPage: (page: number, size: number) => Promise<Page<T>>,
  deps: unknown[],
  size = DEFAULT_PAGE_SIZE,
) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset to page 0 whenever the filter deps change.
  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPage(page, size);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    page,
    setPage,
    content: data?.content ?? [],
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 1,
    loading,
    error,
    reload: load,
  };
}
