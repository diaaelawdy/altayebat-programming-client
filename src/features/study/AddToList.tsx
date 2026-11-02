import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import { Check, ListPlus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';

interface ListItem {
  id: string;
  name: string;
  count: number;
  questionIds: string[];
}

export function useLists(enabled = true) {
  return useQuery({
    queryKey: keys.my('lists'),
    queryFn: () => api.get<{ items: ListItem[] }>('/me/lists'),
    enabled,
  });
}

export function AddToList({ questionId }: { questionId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const lists = useLists(open);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      on
        ? api.put(`/me/lists/${id}/questions/${questionId}`)
        : api.delete(`/me/lists/${id}/questions/${questionId}`),
    onMutate: ({ id, on }) =>
      qc.setQueryData<{ items: ListItem[] }>(
        keys.my('lists'),
        (d) =>
          d && {
            items: d.items.map((l) =>
              l.id === id
                ? {
                    ...l,
                    questionIds: on
                      ? [...l.questionIds, questionId]
                      : l.questionIds.filter((x) => x !== questionId),
                    count: l.count + (on ? 1 : -1),
                  }
                : l,
            ),
          },
      ),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['my', 'lists'] }),
  });
  const create = useMutation({
    mutationFn: () => api.post<ListItem>('/me/lists', { name }),
    onSuccess: (l) => {
      setName('');
      toggle.mutate({ id: l.id, on: true });
      qc.setQueryData<{ items: ListItem[] }>(keys.my('lists'), (d) => ({
        items: [l, ...(d?.items ?? [])],
      }));
    },
  });

  return (
    <div className="relative" ref={ref}>
      <Button
        className="w-full justify-start"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ListPlus size={16} /> {t('q.addToList')}
      </Button>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="border-border bg-surface absolute inset-x-0 z-20 mt-2 rounded-2xl border p-2 shadow-2xl"
          >
            <ul className="max-h-52 overflow-y-auto">
              {lists.data?.items.map((l) => {
                const on = l.questionIds.includes(questionId);
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => toggle.mutate({ id: l.id, on: !on })}
                      className="hover:bg-surface-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                      aria-pressed={on}
                    >
                      <span
                        className={`grid h-4 w-4 place-items-center rounded border ${on ? 'border-accent bg-accent text-on-accent' : 'border-border-strong'}`}
                      >
                        {on && <Check size={12} />}
                      </span>
                      <span className="flex-1 truncate text-start">{l.name}</span>
                      <span className="text-subtle text-xs">{l.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <form
              className="border-border mt-1 flex gap-1 border-t pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) create.mutate();
              }}
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('lists.new')}
                className="py-1.5"
                maxLength={60}
              />
              <Button
                type="submit"
                size="icon"
                variant="soft"
                aria-label={t('lists.new')}
                loading={create.isPending}
              >
                <Plus size={16} />
              </Button>
            </form>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
