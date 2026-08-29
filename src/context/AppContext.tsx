import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';
import type { AdminUser, CurrentUser } from '@/types';
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
  completeMfaSetup: (secret: string, code: string, bearerToken?: string) => Promise<api.EnableMfaResult>;
  verifyMfaLogin: (code: string) => Promise<void>;

  // Admin users (session-scoped — backend has no list endpoint yet)
  adminUsers: AdminUser[];
  createAdminUser: (user: { fullName: string; email: string; phone?: string; roleName: string }) => Promise<void>;
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

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

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
    async (secret: string, code: string, bearerToken?: string) => {
      const token = bearerToken ?? pendingMfa?.token;
      if (!token) throw new api.ApiError(0, 'No MFA session in progress.');
      const result = await api.enableMfa(token, secret, code);
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
    async (code: string) => {
      if (!pendingMfa) throw new api.ApiError(0, 'No MFA session in progress.');
      const tokens = await api.verifyMfa(pendingMfa.token, code);
      api.setTokens(tokens.accessToken, tokens.refreshToken);
      setCurrentUser(userFromStoredToken());
      setPendingMfa(null);
    },
    [pendingMfa],
  );

  const createAdminUser = useCallback(
    async (user: { fullName: string; email: string; phone?: string; roleName: string }) => {
      const created = await api.createAdminUser(user);
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
        adminUsers,
        createAdminUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
