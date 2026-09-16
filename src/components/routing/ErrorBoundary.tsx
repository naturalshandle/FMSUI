import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level render-error catch-all. Without this, any uncaught error in a
 * component tree unmounts React entirely and leaves a blank white page with no
 * user-facing signal — only a console warning. This turns that into a recoverable
 * screen instead. It cannot prevent bugs, only stop one bad render from taking
 * down the whole page.
 *
 * Deliberately a class component (React has no hook-based error boundary API) and
 * deliberately uses a full page navigation (`window.location`) for its actions
 * rather than react-router's useNavigate — a component that itself crashed via a
 * render error is exactly the case where router/context state might be corrupted,
 * so recovery shouldn't depend on it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-base">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-status-rejected">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            This page hit an unexpected error. You can try reloading, or go back to the dashboard.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Reload page
            </button>
            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-100 text-ink-secondary hover:bg-brand-50 hover:text-brand-700 px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
