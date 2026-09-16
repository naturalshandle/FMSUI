import { useState } from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/** Mandatory interstitial shown whenever the access token carries
 * mustChangePassword=true (spec §0.2.6) — blocks every other route until resolved. */
export function ForceChangePasswordScreen() {
  const { changePassword, acknowledgePasswordChanged } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string }>(
    {},
  );
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!currentPassword) newErrors.currentPassword = 'Current password is required';
    if (newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters';
    if (confirmPassword !== newPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setApiError(null);
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setErrors({ currentPassword: 'Incorrect current password.' });
      } else {
        setApiError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
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

        {done ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-ink">Password changed successfully</h2>
            <p className="text-sm text-ink-secondary">You'll be signed out everywhere else.</p>
            <Button onClick={acknowledgePasswordChanged} className="w-full">
              Continue to Dashboard
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-ink mb-1.5">Change your password to continue</h2>
            <p className="text-sm text-ink-secondary mb-8">
              Your administrator requires you to set a new password before you can use the app.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {apiError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-rejected">
                  {apiError}
                </div>
              )}

              <Input
                label="Current password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={errors.currentPassword}
                disabled={loading}
              />

              <Input
                label="New password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={errors.newPassword}
                disabled={loading}
              />

              <Input
                label="Confirm new password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                disabled={loading}
              />

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Changing...' : 'Change password'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
