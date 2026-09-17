import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { activateAccount, ApiError } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * Activate → auto-login → (if the role mandates MFA and it isn't enrolled yet)
 * MFA setup → MFA verify, as one continuous flow. The MFA leg is not built here —
 * once login() returns MFA_REQUIRED we hand off to the same /mfa/verify screen
 * LoginScreen uses, which already detects "not yet enrolled" (409) and forwards to
 * /mfa/setup with the same mfaToken. Re-using that screen keeps there being exactly
 * one implementation of the enroll-then-verify dance.
 */
export function ActivateAccountScreen() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const emailFromLink = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(emailFromLink);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'activating' | 'signing-in' | 'manual-fallback'>('form');

  const busy = phase === 'activating' || phase === 'signing-in';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    if (password.length < 8 || password.length > 128) newErrors.password = 'Password must be 8–128 characters';
    if (confirmPassword !== password) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setApiError(null);
    setPhase('activating');
    try {
      await activateAccount(token, email.trim(), password);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setPhase('form');
      return;
    }

    // Activation succeeded — the password just set is known good, so sign in with
    // it immediately rather than sending the user to a separate login form.
    setPhase('signing-in');
    try {
      const outcome = await login(email.trim(), password);
      if (outcome === 'AUTHENTICATED') {
        navigate('/', { replace: true });
      } else if (outcome === 'MFA_REQUIRED') {
        navigate('/mfa/verify', { replace: true });
      } else {
        setPhase('manual-fallback');
      }
    } catch {
      setPhase('manual-fallback');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-base">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-ink">Naturals FMS</span>
        </div>

        {!token ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-ink">This link is invalid or incomplete</h2>
            <p className="text-sm text-ink-secondary">
              It's missing the activation token. Please use the link exactly as sent in your invitation email.
            </p>
            <Link to="/login" className="inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
              Back to sign in
            </Link>
          </div>
        ) : phase === 'manual-fallback' ? (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold text-ink">Account activated</h2>
            <p className="text-sm text-ink-secondary">
              Your password has been set, but we couldn't sign you in automatically. Please sign in with your new
              password.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to sign in
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-ink mb-1.5">Activate your account</h2>
            <p className="text-sm text-ink-secondary mb-8">Set a password to finish setting up your account.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {apiError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-rejected">
                  {apiError}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="you@naturals.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                disabled={busy}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                disabled={busy}
              />

              <Input
                label="Confirm password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                disabled={busy}
              />

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {phase === 'activating' ? 'Activating...' : phase === 'signing-in' ? 'Signing you in...' : 'Activate account'}
              </Button>
            </form>

            <Link to="/login" className="mt-6 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
