import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AdminUser, CurrentUser, Franchisee, SectionName } from '@/types';
import * as api from '@/lib/api';
import { decodeJwt } from '@/lib/jwt';

export type LoginOutcome = 'AUTHENTICATED' | 'MFA_REQUIRED' | 'MFA_SETUP_REQUIRED' | 'ERROR';

export interface PendingMfa {
  token: string;
  kind: 'VERIFY' | 'SETUP';
}

interface AppState {
  // Auth
  currentUser: CurrentUser | null;
  authError: string | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  logout: () => void;

  // MFA
  pendingMfa: PendingMfa | null;
  cancelMfa: () => void;
  fetchMfaSetupInfo: (bearerToken?: string) => Promise<api.MfaSetupInfo>;
  completeMfaSetup: (secret: string, totp: string, bearerToken?: string) => Promise<api.EnableMfaResult>;
  verifyMfaLogin: (totp: string) => Promise<void>;

  // Data
  franchisees: Franchisee[];
  franchiseesLoading: boolean;
  franchiseesError: string | null;
  refreshFranchisees: () => Promise<void>;
  adminUsers: AdminUser[];

  // Mutations
  verifySection: (franchiseeId: string, section: SectionName) => Promise<void>;
  rejectSection: (franchiseeId: string, section: SectionName, reason: string) => Promise<void>;
  transferFirmOwnership: (firmId: string, toFranchiseeId: string, reason: string) => Promise<void>;
  transferSalonFirm: (salonId: string, toFirmId: string, reason: string) => Promise<void>;
  createAdminUser: (user: { fullName: string; email: string; phoneNumber?: string; role: string }) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function userFromStoredToken(): CurrentUser | null {
  const token = api.getAccessToken();
  if (!token) return null;
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  if (decoded.exp * 1000 < Date.now()) {
    api.clearTokens();
    return null;
  }
  return { userId: decoded.sub, email: decoded.email, roles: decoded.roles ?? [] };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => userFromStoredToken());
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingMfa, setPendingMfa] = useState<PendingMfa | null>(null);

  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [franchiseesLoading, setFranchiseesLoading] = useState(false);
  const [franchiseesError, setFranchiseesError] = useState<string | null>(null);

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const refreshFranchisees = useCallback(async () => {
    setFranchiseesLoading(true);
    setFranchiseesError(null);
    try {
      const data = await api.listFranchisees({ size: 200 });
      setFranchisees(data);
    } catch (err) {
      setFranchiseesError(err instanceof api.ApiError ? err.message : 'Failed to load franchisees.');
    } finally {
      setFranchiseesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshFranchisees();
    } else {
      setFranchisees([]);
    }
  }, [currentUser, refreshFranchisees]);

  const login = useCallback(async (email: string, password: string): Promise<LoginOutcome> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const result = await api.login(email, password);
      if (result.status === 'MFA_REQUIRED') {
        setPendingMfa({ token: result.mfaToken, kind: 'VERIFY' });
        return 'MFA_REQUIRED';
      }
      if (result.status === 'MFA_SETUP_REQUIRED') {
        setPendingMfa({ token: result.mfaToken, kind: 'SETUP' });
        return 'MFA_SETUP_REQUIRED';
      }
      api.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
      setCurrentUser(userFromStoredToken());
      return 'AUTHENTICATED';
    } catch (err) {
      setAuthError(err instanceof api.ApiError ? err.message : 'Unable to sign in. Please try again.');
      return 'ERROR';
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    void api.logout();
    api.clearTokens();
    setCurrentUser(null);
    setPendingMfa(null);
  }, []);

  const cancelMfa = useCallback(() => {
    setPendingMfa(null);
    setAuthError(null);
  }, []);

  const fetchMfaSetupInfo = useCallback(
    async (bearerToken?: string) => {
      const token = bearerToken ?? pendingMfa?.token;
      if (!token) throw new api.ApiError(0, 'No MFA session in progress.');
      return api.getMfaSetup(token);
    },
    [pendingMfa],
  );

  const completeMfaSetup = useCallback(
    async (secret: string, totp: string, bearerToken?: string) => {
      const token = bearerToken ?? pendingMfa?.token;
      if (!token) throw new api.ApiError(0, 'No MFA session in progress.');
      const result = await api.enableMfa(token, secret, totp);
      if (result.status === 'TOKENS') {
        api.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
        setCurrentUser(userFromStoredToken());
        setPendingMfa(null);
      } else if (pendingMfa) {
        // First-login setup with no tokens issued (shouldn't normally happen) — fall back to login screen.
        setPendingMfa(null);
      }
      return result;
    },
    [pendingMfa],
  );

  const verifyMfaLogin = useCallback(
    async (totp: string) => {
      if (!pendingMfa) throw new api.ApiError(0, 'No MFA session in progress.');
      const tokens = await api.verifyMfa(pendingMfa.token, totp);
      api.setTokens(tokens.accessToken, tokens.refreshToken);
      setCurrentUser(userFromStoredToken());
      setPendingMfa(null);
    },
    [pendingMfa],
  );

  const verifySection = useCallback(async (franchiseeId: string, section: SectionName) => {
    await api.verifySection(franchiseeId, section);
    const updated = await api.getFranchisee(franchiseeId);
    setFranchisees((prev) => prev.map((f) => (f.id === franchiseeId ? updated : f)));
  }, []);

  const rejectSection = useCallback(async (franchiseeId: string, section: SectionName, reason: string) => {
    await api.rejectSection(franchiseeId, section, reason);
    const updated = await api.getFranchisee(franchiseeId);
    setFranchisees((prev) => prev.map((f) => (f.id === franchiseeId ? updated : f)));
  }, []);

  const transferFirmOwnership = useCallback(
    async (firmId: string, toFranchiseeId: string, reason: string) => {
      await api.transferFirmOwnership(firmId, toFranchiseeId, reason);
      await refreshFranchisees();
    },
    [refreshFranchisees],
  );

  const transferSalonFirm = useCallback(
    async (salonId: string, toFirmId: string, reason: string) => {
      await api.transferSalonFirm(salonId, toFirmId, reason);
      await refreshFranchisees();
    },
    [refreshFranchisees],
  );

  const createAdminUser = useCallback(
    async (user: { fullName: string; email: string; phoneNumber?: string; role: string }) => {
      const created = await api.createAdminUser({
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        roleNames: [user.role],
      });
      setAdminUsers((prev) => [...prev, created]);
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{
        currentUser,
        authError,
        authLoading,
        login,
        logout,
        pendingMfa,
        cancelMfa,
        fetchMfaSetupInfo,
        completeMfaSetup,
        verifyMfaLogin,
        franchisees,
        franchiseesLoading,
        franchiseesError,
        refreshFranchisees,
        adminUsers,
        verifySection,
        rejectSection,
        transferFirmOwnership,
        transferSalonFirm,
        createAdminUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
