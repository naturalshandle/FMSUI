import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Unit shown inside the field's right edge, e.g. "%" or "₹". */
  suffix?: string;
}

// Labels here previously had no htmlFor/id association at all — visually correct
// but programmatically invisible to screen readers (and to any getByLabel-style
// test query). useId() ties each field's label to its control; props.id (if the
// caller passed one) still wins so existing explicit ids keep working.
export function Input({ label, error, suffix, className = '', id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={`w-full rounded-xl bg-brand-50/50 border border-brand-100 px-4 py-2.5 text-sm text-ink placeholder:text-ink-secondary/50 transition-all focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none ${error ? 'border-red-300 bg-red-50/30' : ''} ${suffix ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-secondary" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-status-rejected">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className = '', children, id, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full rounded-xl bg-brand-50/50 border border-brand-100 px-4 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full rounded-xl bg-brand-50/50 border border-brand-100 px-4 py-2.5 text-sm text-ink placeholder:text-ink-secondary/50 transition-all focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none resize-none ${error ? 'border-red-300 bg-red-50/30' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-status-rejected">{error}</p>}
    </div>
  );
}
