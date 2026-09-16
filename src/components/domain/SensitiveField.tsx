import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { requestStepUp } from '@/lib/stepUp';
import { ApiError } from '@/lib/api';

const AUTO_HIDE_MS = 30_000;

interface SensitiveFieldProps {
  label: string;
  maskedValue: string;
  /** Given a fresh step-up token, resolves the plaintext value to reveal. */
  onReveal: (stepUpToken: string) => Promise<string>;
}

/**
 * Masked value + "Reveal" control per spec §0.2.8/§4 — prompts for a fresh TOTP
 * code every time (step-up tokens are never cached across actions), then shows
 * the plaintext with a visible Hide toggle and a 30s auto-hide timer, like a
 * password-manager reveal rather than a permanent display.
 */
export function SensitiveField({ label, maskedValue, onReveal }: SensitiveFieldProps) {
  const { showToast } = useToast();
  const [promptOpen, setPromptOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const startReveal = () => {
    setCode('');
    setError(null);
    setPromptOpen(true);
  };

  const hide = () => {
    setRevealed(null);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  const confirmReveal = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { stepUpToken } = await requestStepUp(code);
      const value = await onReveal(stepUpToken);
      setRevealed(value);
      setPromptOpen(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(hide, AUTO_HIDE_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify code. Please try again.');
      if (err instanceof ApiError && err.status !== 401 && err.status !== 400) {
        showToast('error', err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-ink">{revealed ?? maskedValue}</span>
        {revealed ? (
          <button onClick={hide} className="text-ink-secondary hover:text-brand-700" aria-label={`Hide ${label}`}>
            <EyeOff className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={startReveal} className="text-ink-secondary hover:text-brand-700" aria-label={`Reveal ${label}`}>
            <Eye className="h-4 w-4" />
          </button>
        )}
      </div>

      <Modal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        title={`Verify to reveal ${label}`}
        description="Enter a fresh 6-digit code from your authenticator app."
        primaryLabel={busy ? 'Verifying...' : 'Reveal'}
        primaryDisabled={busy || code.length !== 6}
        onPrimary={confirmReveal}
      >
        <Input
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          error={error ?? undefined}
          disabled={busy}
        />
      </Modal>
    </>
  );
}
