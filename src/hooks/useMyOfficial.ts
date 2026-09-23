import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { listOfficials } from '@/lib/officialsApi';
import { FIELD_ROLES } from '@/lib/roles';
import type { Official, Salon } from '@/types';

// The three field roles' names are identical to their officialType values.
const MAX_PAGES = 50;
const PAGE_SIZE = 100;

// Cached per (userId, officialType) for the session, as promises so concurrent
// callers share one lookup. Failures are evicted so a later mount can retry.
const cache = new Map<string, Promise<Official | null>>();

async function findOfficialByUserId(userId: string, officialType: string): Promise<Official | null> {
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await listOfficials({ officialType, page, size: PAGE_SIZE });
    const match = res.content.find((o) => o.userId === userId);
    if (match) return match;
    if (res.last || res.empty) return null;
  }
  return null;
}

function lookup(userId: string, officialType: string): Promise<Official | null> {
  const key = `${userId}:${officialType}`;
  let p = cache.get(key);
  if (!p) {
    p = findOfficialByUserId(userId, officialType);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

/**
 * Resolves the signed-in user's Official record: takes `sub` from the JWT-derived
 * currentUser, lists officials of the user's role type and matches on userId. Admins
 * and users without a field role resolve to null immediately. UX gating only — the
 * backend enforces assignment with a 403.
 */
export function useMyOfficial(): { official: Official | null; loading: boolean } {
  const { currentUser } = useApp();
  const userId = currentUser?.userId;
  const officialType = currentUser?.roles.find((r) => (FIELD_ROLES as readonly string[]).includes(r));

  const [state, setState] = useState<{ key: string; official: Official | null } | null>(null);
  const key = userId && officialType ? `${userId}:${officialType}` : '';

  useEffect(() => {
    if (!key || !userId || !officialType) return;
    let cancelled = false;
    lookup(userId, officialType)
      .then((official) => {
        if (!cancelled) setState({ key, official });
      })
      .catch(() => {
        if (!cancelled) setState({ key, official: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key, userId, officialType]);

  if (!key) return { official: null, loading: false };
  if (state?.key !== key) return { official: null, loading: true };
  return { official: state.official, loading: false };
}

/** True when the official is the salon's cluster, regional or state head. */
export function isAssignedToSalon(official: Official | null, salon: Salon | null | undefined): boolean {
  if (!official || !salon) return false;
  return [salon.clusterHeadOfficialId, salon.regionalHeadOfficialId, salon.stateHeadOfficialId].includes(official.id);
}

/** True when the official is specifically the salon's State Head. */
export function isSalonStateHead(official: Official | null, salon: Salon | null | undefined): boolean {
  return !!official && !!salon && salon.stateHeadOfficialId === official.id;
}
