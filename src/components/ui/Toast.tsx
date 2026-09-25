import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const iconMap: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-status-verified" />,
  error: <AlertCircle className="h-5 w-5 text-status-rejected" />,
  info: <Info className="h-5 w-5 text-brand-500" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-[60] flex flex-col items-stretch sm:items-end gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 bg-white rounded-xl shadow-lg border border-brand-100 px-4 py-3 animate-slide-in-right w-full sm:w-auto sm:min-w-[300px] sm:max-w-md"
          >
            {iconMap[t.kind]}
            <p className="text-sm text-ink flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-ink-secondary hover:text-ink transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
