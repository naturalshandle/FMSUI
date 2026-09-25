import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getPostLoginPath, forwardAuthRedirect } from '@/lib/authRedirect';

const TOTP_PATTERN = /^\d{6}$/;

export function MfaVerifyScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingMfa, verifyMfaLogin, cancelMfa, redirectToMfaSetup } = useApp();
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!pendingMfa || pendingMfa.kind !== 'VERIFY') {
    return <Navigate to="/login" replace state={forwardAuthRedirect(location.state)} />;
  }

  const handleBackToLogin = () => {
    cancelMfa();
    navigate('/login', { replace: true, state: forwardAuthRedirect(location.state) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!TOTP_PATTERN.test(totp)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyMfaLogin(totp);
      navigate(getPostLoginPath(location.state));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // "MFA setup has not been completed for this account yet" — expected
        // first-time-enrollment branch per spec §0.2.2, not shown as an error.
        redirectToMfaSetup();
        navigate('/mfa/setup', { replace: true, state: forwardAuthRedirect(location.state) });
      } else if (err instanceof ApiError && err.status === 401 && err.message === 'Invalid or expired token') {
        setExpired(true);
        setError('Your session expired, please log in again.');
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Incorrect code. Please try again.');
        setTotp('');
      } else {
        setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-base">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-ink">Naturals FMS</span>
        </div>

        <h2 className="text-2xl font-bold text-ink mb-1.5">Enter verification code</h2>
        <p className="text-sm text-ink-secondary mb-8">
          Open your authenticator app and enter the 6-digit code for this account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-rejected">
              {error}
            </div>
          )}

          {expired ? (
            <Button type="button" size="lg" className="w-full" onClick={handleBackToLogin}>
              Back to login
            </Button>
          ) : (
            <>
              <Input
                label="Verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
              />

              <Button type="submit" size="lg" className="w-full" disabled={loading || totp.length !== 6}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Verify
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full text-center text-sm text-ink-secondary hover:text-brand-700 transition-colors"
              >
                Not you? Back to login
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
