import { AnimatePresence, m } from 'framer-motion';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';

export interface DropdownOption {
  value: string;
  label: string;
}

/** Custom select: styled popover with type-to-filter search and full keyboard support. */
export function Dropdown({
  value,
  onChange,
  options,
  label,
  placeholder,
  searchable = options.length > 6,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  label: string;
  /** Shown when `value` matches no option. */
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    requestAnimationFrame(() => (searchable ? searchRef.current : listRef.current)?.focus());
    return () => document.removeEventListener('pointerdown', onDown);
    // Only reset when opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const pick = (v: string) => {
    onChange(v);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(filtered.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered[active];
      if (o) pick(o.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const listId = `${id}-list`;
  const optId = (i: number) => `${id}-opt-${i}`;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${selected?.label ?? placeholder ?? ''}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'border-border bg-surface-2 text-fg flex h-11 w-full items-center gap-2 rounded-2xl border px-4 text-start text-[15px] transition-[border-color,box-shadow] outline-none',
          'hover:border-border-strong focus-visible:border-accent focus-visible:shadow-[0_0_0_4px_var(--accent-soft)]',
          open && 'border-accent shadow-[0_0_0_4px_var(--accent-soft)]',
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <span className="text-subtle">{label}:</span> {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn('text-subtle shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="border-border bg-surface shadow-card absolute inset-x-0 top-full z-40 mt-2 min-w-56 origin-top overflow-hidden rounded-2xl border"
          >
            {searchable && (
              <div className="border-border flex items-center gap-2 border-b px-3">
                <Search size={15} className="text-subtle shrink-0" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder={`${t('common.search')}…`}
                  role="combobox"
                  aria-expanded
                  aria-controls={listId}
                  aria-activedescendant={filtered[active] ? optId(active) : undefined}
                  aria-label={label}
                  className="text-fg placeholder:text-subtle h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              tabIndex={searchable ? -1 : 0}
              onKeyDown={searchable ? undefined : onKeyDown}
              aria-activedescendant={!searchable && filtered[active] ? optId(active) : undefined}
              className="max-h-72 overflow-y-auto overscroll-contain p-1.5 outline-none"
            >
              {filtered.length === 0 && (
                <li className="text-subtle px-3 py-6 text-center text-sm">
                  {t('common.noResults')}
                </li>
              )}
              {filtered.map((o, i) => {
                const isSel = o.value === value;
                return (
                  <li
                    key={o.value}
                    id={optId(i)}
                    data-index={i}
                    role="option"
                    aria-selected={isSel}
                    onPointerMove={() => setActive(i)}
                    onClick={() => pick(o.value)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                      i === active ? 'bg-surface-3 text-fg' : 'text-muted',
                      isSel && 'text-accent font-medium',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {isSel && <Check size={15} className="shrink-0" />}
                  </li>
                );
              })}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
