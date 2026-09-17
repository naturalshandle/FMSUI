import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CurrentUser } from '@/types';
import * as api from '@/lib/api';
import { decodeJwt } from '@/lib/jwt';

export type LoginOutcome = 'AUTHENTICATED' | 'MFA_REQUIRED' | 'ERROR';

export interface PendingMfa {
  token: string;
  kind: 'VERIFY' | 'SETUP';
}

interface AppState {
  // Auth
  currentUser: CurrentUser | null;
  mustChangePassword: boolean;
  authInitializing: boolean;
  authError: string | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Clears the mustChangePassword gate after the user has seen the success
   * confirmation — kept separate from changePassword so the confirmation screen
   * has a moment to render before RequireAuth swaps back to the normal app. */
  acknowledgePasswordChanged: () => void;

  // MFA
  pendingMfa: PendingMfa | null;
  cancelMfa: () => void;
  /** Switches the pending MFA flow from VERIFY to SETUP, carrying the same mfaToken
   * forward — the response to a 409 "MFA setup has not been completed" from
   * /auth/mfa/verify (spec §0.2.2), never shown to the user as an error. */
  redirectToMfaSetup: () => void;
  fetchMfaSetupInfo: (bearerToken?: string) => Promise<api.MfaSetupInfo>;
  /** POST /auth/mfa/enable — confirms MFA is now enabled but returns no tokens.
   * Per spec §0.2.4, the caller must follow up with a fresh verifyMfaLogin() call
   * (a newly-entered code) to actually complete login. Does not clear pendingMfa. */
  enableMfaSetup: (code: string) => Promise<string>;
  verifyMfaLogin: (code: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function userFromStoredToken(): { user: CurrentUser; mustChangePassword: boolean } | null {
  const token = api.getAccessToken();
  if (!token) return null;
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  if (decoded.exp * 1000 < Date.now()) {
    api.clearTokens();
    return null;
  }
  return {
    user: { userId: decoded.sub, email: decoded.email, roles: decoded.roles ?? [] },
    mustChangePassword: decoded.mustChangePassword ?? false,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingMfa, setPendingMfa] = useState<PendingMfa | null>(null);

  const applySession = useCallback(() => {
    const restored = userFromStoredToken();
    setCurrentUser(restored?.user ?? null);
    setMustChangePassword(restored?.mustChangePassword ?? false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await api.restoreSession();
      if (cancelled) return;
      if (restored) applySession();
      setAuthInitializing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(async (email: string, password: string): Promise<LoginOutcome> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const result = await api.login(email, password);
      if (result.status === 'MFA_REQUIRED') {
        setPendingMfa({ token: result.mfaToken, kind: 'VERIFY' });
        return 'MFA_REQUIRED';
      }
      api.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
      applySession();
      return 'AUTHENTICATED';
    } catch (err) {
      setAuthError(err instanceof api.ApiError ? err.message : 'Unable to sign in. Please try again.');
      return 'ERROR';
    } finally {
      setAuthLoading(false);
    }
  }, [applySession]);

  const logout = useCallback(() => {
    void api.logout();
    api.clearTokens();
    setCurrentUser(null);
    setMustChangePassword(false);
    setPendingMfa(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.changePassword(currentPassword, newPassword);
  }, []);

  const acknowledgePasswordChanged = useCallback(() => {
    // The current access token was issued before the flag flipped server-side;
    // unblock the gate locally rather than waiting on a fresh token.
    setMustChangePassword(false);
  }, []);

  const cancelMfa = useCallback(() => {
    setPendingMfa(null);
    setAuthError(null);
  }, []);

  const redirectToMfaSetup = useCallback(() => {
    setPendingMfa((prev) => (prev ? { token: prev.token, kind: 'SETUP' } : prev));
  }, []);

  const fetchMfaSetupInfo = useCallback(
    async (bearerToken?: string) => {
      const token = bearerToken ?? pendingMfa?.token;
      if (!token) throw new api.ApiError(0, 'No MFA session in progress.');
      return api.getMfaSetup(token);
    },
    [pendingMfa],
  );

  const enableMfaSetup = useCallback(
    async (code: string) => {
      const token = pendingMfa?.token;
      if (!token) throw new api.ApiError(0, 'No MFA session in progress.');
      const result = await api.enableMfa(token, code);
      return result.message;
    },
    [pendingMfa],
  );

  const verifyMfaLogin = useCallback(
    async (code: string) => {
      if (!pendingMfa) throw new api.ApiError(0, 'No MFA session in progress.');
      const tokens = await api.verifyMfa(pendingMfa.token, code);
      api.setTokens(tokens.accessToken, tokens.refreshToken);
      applySession();
      setPendingMfa(null);
    },
    [pendingMfa, applySession],
  );

  return (
    <AppContext.Provider
      value={{
        currentUser,
        mustChangePassword,
        authInitializing,
        authError,
        authLoading,
        login,
        logout,
        changePassword,
        acknowledgePasswordChanged,
        pendingMfa,
        cancelMfa,
        redirectToMfaSetup,
        fetchMfaSetupInfo,
        enableMfaSetup,
        verifyMfaLogin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
