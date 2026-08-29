import { type ReactNode, useCallback, useState } from 'react';

export function useDelayedLoading(minMs = 500, maxMs = 800) {
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async <T,>(value: T): Promise<T> => {
      setLoading(true);
      const delay = minMs + Math.random() * (maxMs - minMs);
      await new Promise((r) => setTimeout(r, delay));
      setLoading(false);
      return value;
    },
    [minMs, maxMs],
  );

  return { loading, load, setLoading };
}

export function LoadingBoundary({
  loading,
  skeleton,
  children,
}: {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}) {
  if (loading) return <>{skeleton}</>;
  return <>{children}</>;
}
