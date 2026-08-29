import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-ink">{label}</label>}
      <input
        className={`w-full rounded-xl bg-brand-50/50 border border-brand-100 px-4 py-2.5 text-sm text-ink placeholder:text-ink-secondary/50 transition-all focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none ${error ? 'border-red-300 bg-red-50/30' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-status-rejected">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-ink">{label}</label>}
      <select
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

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-ink">{label}</label>}
      <textarea
        className={`w-full rounded-xl bg-brand-50/50 border border-brand-100 px-4 py-2.5 text-sm text-ink placeholder:text-ink-secondary/50 transition-all focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none resize-none ${error ? 'border-red-300 bg-red-50/30' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-status-rejected">{error}</p>}
    </div>
  );
}
