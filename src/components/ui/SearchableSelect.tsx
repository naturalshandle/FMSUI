import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

/** Type-to-filter dropdown for picking one option out of a (potentially long) list
 * by its visible label — used where a plain <select> would force scrolling through
 * more entries than an admin can realistically scan, e.g. picking a user by email. */
export function SearchableSelect({
  label,
  placeholder = 'Search...',
  options,
  value,
  onChange,
  disabled,
  emptyMessage = 'No matches.',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered =
    query.trim().length === 0
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="space-y-1.5" ref={rootRef}>
      {label && <label className="block text-sm font-medium text-ink">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen((o) => !o);
            setQuery('');
          }}
          className={`flex w-full items-center justify-between gap-2 rounded-xl bg-brand-50/50 border border-brand-100 px-4 py-2.5 text-sm text-left transition-all focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${selected ? 'text-ink' : 'text-ink-secondary/60'}`}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-secondary" />
        </button>

        {open && (
          <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-brand-100 bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-brand-50">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to filter..."
                className="w-full rounded-lg bg-brand-50/50 border border-brand-100 px-3 py-1.5 text-sm text-ink placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink-secondary">{emptyMessage}</p>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-brand-50/70 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.description && <span className="block truncate text-xs text-ink-secondary">{o.description}</span>}
                    </span>
                    {o.value === value && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
