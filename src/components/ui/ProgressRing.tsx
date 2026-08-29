interface ProgressRingProps {
  percentage: number;
  size?: number;
}

/**
 * Simple single-value (0-100) circular progress meter, distinct from the
 * two-signal completion meter used on the franchisee self-service side.
 */
export function ProgressRing({ percentage, size = 72 }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-brand-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-brand-600 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-ink">{Math.round(clamped)}%</span>
      </div>
    </div>
  );
}
