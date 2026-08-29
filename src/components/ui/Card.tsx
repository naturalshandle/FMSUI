import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-card border border-brand-50 ${hover ? 'cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
