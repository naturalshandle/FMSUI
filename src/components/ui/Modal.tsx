import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryVariant?: 'primary' | 'danger';
  cancelLabel?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryVariant = 'primary',
  cancelLabel = 'Cancel',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/*
        The overlay itself scrolls (rather than centering a fixed box with no
        escape hatch) so a modal taller than the viewport still shows its full
        header instead of overflowing above the visible area. min-h-full + a
        centering flex on this inner wrapper keeps short modals centered like
        before; my-8 gives room to scroll to when a modal is taller than the
        screen instead of it being flush against the edges.
      */}
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg my-8 bg-white rounded-2xl shadow-xl border border-brand-100 animate-slide-up max-h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex items-start justify-between p-6 pb-4 shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
              {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-secondary hover:bg-brand-50 hover:text-brand-700 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-2 overflow-y-auto">{children}</div>
          <div className="flex items-center justify-end gap-3 p-6 pt-4 shrink-0">
            <Button variant="secondary" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              variant={primaryVariant === 'danger' ? 'danger' : 'primary'}
              onClick={onPrimary}
              disabled={primaryDisabled}
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
