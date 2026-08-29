import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-brand-600 to-brand-400 text-white shadow-card hover:shadow-card-hover hover:from-brand-700 hover:to-brand-500 active:scale-[0.98]',
  secondary:
    'bg-white text-brand-700 border border-brand-200 hover:bg-brand-50 hover:border-brand-300 active:scale-[0.98]',
  ghost:
    'bg-transparent text-ink-secondary hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98]',
  danger:
    'bg-white text-status-rejected border border-red-200 hover:bg-red-50 hover:border-red-300 active:scale-[0.98]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
