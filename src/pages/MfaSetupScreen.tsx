import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { ShieldCheck, ArrowRight, Copy, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const TOTP_PATTERN = /^\d{6}$/;

export function MfaSetupScreen() {
  const navigate = useNavigate();
  const { pendingMfa, fetchMfaSetupInfo, completeMfaSetup, cancelMfa } = useApp();
  const { showToast } = useToast();

  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [totp, setTotp] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pendingMfa || pendingMfa.kind !== 'SETUP') return;
    let cancelled = false;
    fetchMfaSetupInfo()
      .then(async (info) => {
        if (cancelled) return;
        setSecret(info.secret);
        const dataUrl = await QRCode.toDataURL(info.qrCodeUri, { width: 220, margin: 1 });
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setExpired(true);
          setLoadError('Your setup session has expired. Please log in again.');
        } else {
          setLoadError(err instanceof Error ? err.message : 'Failed to load MFA setup details.');
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pendingMfa || pendingMfa.kind !== 'SETUP') {
    return <Navigate to="/login" replace />;
  }

  const handleBackToLogin = () => {
    cancelMfa();
    navigate('/login', { replace: true });
  };

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — the secret is still visible to copy manually
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret) return;
    if (!TOTP_PATTERN.test(totp)) {
      setSubmitError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await completeMfaSetup(secret, totp);
      if (result.status === 'TOKENS') {
        navigate('/');
      } else {
        showToast('success', result.message);
        navigate('/login', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setExpired(true);
        setSubmitError('Your setup session has expired. Please log in again.');
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Could not enable MFA. Please try again.');
      }
    } finally {
      setSubmitting(false);
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

        <h2 className="text-2xl font-bold text-ink mb-1.5">Set up two-factor authentication</h2>
        <p className="text-sm text-ink-secondary mb-6">
          Your role requires MFA. Scan the QR code with an authenticator app (e.g. Google Authenticator, Authy),
          then enter the 6-digit code to finish setup.
        </p>

        {loadError && !qrDataUrl ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-rejected">
              {loadError}
            </div>
            {expired && (
              <Button type="button" size="lg" className="w-full" onClick={handleBackToLogin}>
                Back to login
              </Button>
            )}
          </div>
        ) : !qrDataUrl ? (
          <div className="flex justify-center py-10">
            <span className="h-6 w-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex justify-center">
              <img src={qrDataUrl} alt="Scan this QR code with your authenticator app" className="rounded-xl border border-brand-100" />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-ink-secondary">Can't scan? Enter this code manually:</p>
              <button
                type="button"
                onClick={handleCopySecret}
                className="flex w-full items-center justify-between gap-2 rounded-xl bg-brand-50/50 border border-brand-100 px-4 py-2.5 text-sm font-mono text-ink hover:border-brand-300 transition-colors"
              >
                <span className="truncate">{secret}</span>
                {copied ? (
                  <Check className="h-4 w-4 text-status-verified shrink-0" />
                ) : (
                  <Copy className="h-4 w-4 text-ink-secondary shrink-0" />
                )}
              </button>
            </div>

            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-rejected">
                {submitError}
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
                  disabled={submitting}
                />

                <Button type="submit" size="lg" className="w-full" disabled={submitting || totp.length !== 6}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enabling...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Enable MFA
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
        )}
      </div>
    </div>
  );
}
