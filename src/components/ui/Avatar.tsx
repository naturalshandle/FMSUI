interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

export function Avatar({ initials, size = 'md' }: AvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-white font-semibold shadow-sm ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  );
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
