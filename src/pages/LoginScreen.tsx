import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginScreen() {
  const navigate = useNavigate();
  const { login, authLoading, authError } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password.trim()) newErrors.password = 'Password is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const outcome = await login(email.trim(), password);
    if (outcome === 'AUTHENTICATED') navigate('/');
    else if (outcome === 'MFA_REQUIRED') navigate('/mfa/verify');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">Naturals FMS</p>
              <p className="text-sm text-white/70">Franchise Management System</p>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Manage your franchise network with confidence
            </h1>
            <p className="text-lg text-white/80 leading-relaxed max-w-md">
              Review franchisee applications, verify documents, manage firm and salon
              ownership — all from one centralised admin console.
            </p>
          </div>
          <p className="text-sm text-white/60">© 2026 Naturals Salon. All rights reserved.</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface-base">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-ink">Naturals FMS</span>
          </div>

          <h2 className="text-2xl font-bold text-ink mb-1.5">Welcome back</h2>
          <p className="text-sm text-ink-secondary mb-8">Sign in to the admin console to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {authError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-rejected">
                {authError}
              </div>
            )}

            <div className="relative">
              <Input
                label="Email address"
                type="email"
                placeholder="you@naturals.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                disabled={authLoading}
              />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                disabled={authLoading}
              />
              <div className="mt-1.5 text-right">
                <Link to="/forgot-password" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={authLoading}>
              {authLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-ink-secondary">
            Signs in against the FMS backend at localhost:8080.
          </p>
        </div>
      </div>
    </div>
  );
}
