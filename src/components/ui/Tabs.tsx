import { m } from 'framer-motion';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

/** Accessible tablist with an animated indicator. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      className={cn('border-border flex gap-1 overflow-x-auto border-b', className)}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn(
              'relative px-3 pt-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span className="bg-surface-3 text-muted ms-1.5 rounded-md px-1.5 py-0.5 text-xs">
                {it.count}
              </span>
            )}
            {active && (
              <m.span
                layoutId={`tab-${id}`}
                className="bg-accent absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Compact pill switch (sort toggles etc.). */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="border-border bg-surface inline-flex rounded-xl border p-1"
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="radio"
          aria-checked={it.value === value}
          onClick={() => onChange(it.value)}
          className={cn(
            'relative rounded-lg px-3 py-1 text-sm transition-colors',
            it.value === value ? 'text-fg' : 'text-muted hover:text-fg',
          )}
        >
          {it.value === value && (
            <m.span
              layoutId={`seg-${id}`}
              className="bg-surface-3 absolute inset-0 rounded-lg"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <span className="relative">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
