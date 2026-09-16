import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { activateAccount, ApiError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function ActivateAccountScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const emailFromLink = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(emailFromLink);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (password.length < 8 || password.length > 128) newErrors.password = 'Password must be 8–128 characters';
    if (confirmPassword !== password) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!token) {
      setApiError('This activation link is missing its token. Please use the link from your invitation email.');
      return;
    }

    setApiError(null);
    setLoading(true);
    try {
      await activateAccount(token, email.trim(), password);
      setDone(true);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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

        {done ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-ink">Account activated</h2>
            <p className="text-sm text-ink-secondary">Your password has been set. You can now sign in.</p>
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
              {!token && !apiError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  This link is missing an activation token. Open it from your invitation email.
                </div>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="you@naturals.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                disabled={loading}
              />

              <Input
                label="Confirm password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                disabled={loading}
              />

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Activating...' : 'Activate account'}
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
