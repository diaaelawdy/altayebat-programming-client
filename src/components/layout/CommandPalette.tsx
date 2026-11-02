import { AnimatePresence, m } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Building2, CornerDownLeft, FileQuestion, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api, qs } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useDebounced } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { useI18n } from '@/i18n';
import type { Company, QuestionSummary } from '@/shared/types';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { DifficultyBadge } from '@/components/ui/Badges';

type Item = { kind: 'company'; c: Company } | { kind: 'question'; q: QuestionSummary };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, companyName } = useI18n();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const dq = useDebounced(q.trim(), 180);

  // Server-side search: the company list is paginated.
  const companies = useQuery({
    queryKey: keys.companies(dq, 'popular'),
    queryFn: ({ signal }) =>
      api.get<{ items: Company[] }>(
        `/companies${qs({ q: dq, sort: 'popular', limit: 6 })}`,
        signal,
      ),
    enabled: open,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
  const questions = useQuery({
    queryKey: keys.search(dq),
    queryFn: ({ signal }) =>
      api.get<{ items: QuestionSummary[] }>(`/questions/search${qs({ q: dq })}`, signal),
    enabled: open && dq.length >= 2,
    placeholderData: (prev) => prev,
  });

  const items: Item[] = useMemo(() => {
    const needle = dq.toLowerCase();
    const cs = (companies.data?.items ?? [])
      .slice(0, needle ? 5 : 6)
      .map((c) => ({ kind: 'company' as const, c }));
    const qsr =
      dq.length >= 2
        ? (questions.data?.items ?? []).map((x) => ({ kind: 'question' as const, q: x }))
        : [];
    return [...cs, ...qsr];
  }, [companies.data, questions.data, dq]);

  useEffect(() => {
    setIdx(0);
  }, [dq]);
  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => input.current?.focus(), 20);
    }
  }, [open]);

  const go = (it: Item | undefined) => {
    if (!it) return;
    onClose();
    if (it.kind === 'company') nav(`/c/${it.c.slug}`);
    else if (it.q.company) nav(`/c/${it.q.company.slug}/${it.q.slug}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') go(items[idx]);
    else if (e.key === 'Escape') onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label={t('palette.hint')}
            className="border-border bg-surface relative w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl"
            initial={{ scale: 0.96, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: -6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          >
            <div className="border-border flex items-center gap-3 border-b px-4">
              <Search size={18} className="text-subtle" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder={t('palette.placeholder')}
                className="placeholder:text-subtle h-14 flex-1 bg-transparent text-[15px] outline-none"
                role="combobox"
                aria-expanded
                aria-controls="palette-list"
                aria-activedescendant={`pi-${idx}`}
              />
              <kbd className="border-border text-subtle rounded-md border px-1.5 py-0.5 text-[10px]">
                ESC
              </kbd>
            </div>
            <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && (
                <li className="text-subtle px-3 py-8 text-center text-sm">{t('palette.empty')}</li>
              )}
              {items.map((it, i) => (
                <li
                  key={it.kind === 'company' ? `c${it.c.id}` : `q${it.q.id}`}
                  id={`pi-${i}`}
                  role="option"
                  aria-selected={i === idx}
                  onMouseMove={() => setIdx(i)}
                  onClick={() => go(it)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5',
                    i === idx && 'bg-surface-2',
                  )}
                >
                  {it.kind === 'company' ? (
                    <>
                      <CompanyLogo name={it.c.name} logoUrl={it.c.logoUrl} size={30} />
                      <span className="flex-1 truncate">{companyName(it.c)}</span>
                      <Building2 size={14} className="text-subtle" />
                    </>
                  ) : (
                    <>
                      <FileQuestion size={18} className="text-subtle shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{it.q.title}</span>
                        <span className="text-subtle text-xs">
                          {it.q.company && companyName(it.q.company)}
                        </span>
                      </span>
                      <DifficultyBadge value={it.q.difficulty} />
                    </>
                  )}
                  {i === idx && (
                    <CornerDownLeft size={14} className="text-subtle rtl:-scale-x-100" />
                  )}
                </li>
              ))}
            </ul>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
