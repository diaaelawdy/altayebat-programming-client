import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import {
  Ban,
  Check,
  FilePlus2,
  History,
  Pencil,
  Redo2,
  Shield,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { LoadMore, usePaged } from '@/lib/paged';
import { useI18n, type MessageKey } from '@/i18n';
import type { HistoryEntry, HistoryStacks } from '@/shared/types';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { UserChip } from '@/components/ui/UserChip';
import { useCan } from '@/features/auth/Can';
import { MOD_KEY } from '@/lib/platform';

const ICONS: Record<string, typeof Pencil> = {
  create: FilePlus2,
  edit: Pencil,
  delete: Trash2,
  undo: Undo2,
  redo: Redo2,
  approve: Check,
  reject: X,
  status: Ban,
  role: Shield,
};

/** "created an answer", "undid: deleted a comment", … */
function useDescribe() {
  const { t } = useI18n();
  return (e: HistoryEntry) => {
    const what = t(`history.target.${e.targetType}` as MessageKey);
    if (e.action === 'undo' || e.action === 'redo')
      return t(`history.action.${e.action}` as MessageKey, {
        what: t(`history.action.${e.detail || 'edit'}` as MessageKey, { what }),
      });
    return t(`history.action.${e.action}` as MessageKey, { what });
  };
}

/** Activity log, plus your undo and redo stacks for your own posts. */
export function HistoryPage() {
  const { t } = useI18n();
  const can = useCan();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const list = usePaged<HistoryEntry>(keys.history(scope), `/history?scope=${scope}`);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <History size={22} className="text-accent" /> {t('history.title')}
      </h1>
      <p className="text-muted mt-1 text-sm">{t('history.subtitle')}</p>

      <Stacks />

      <section className="mt-10">
        {can('logs.view') ? (
          <Tabs
            value={scope}
            onChange={setScope}
            items={[
              { value: 'mine', label: t('history.mine') },
              { value: 'all', label: t('history.everyone') },
            ]}
          />
        ) : (
          <h2 className="text-lg font-semibold">{t('history.mine')}</h2>
        )}
        <div className="mt-4">
          {list.isLoading ? (
            <ListSkeleton />
          ) : !list.items.length ? (
            <EmptyState icon={<History size={20} />} title={t('history.empty')} />
          ) : (
            <ol className="border-border relative ms-3 border-s">
              {list.items.map((e) => (
                <LogRow key={e.id} e={e} showActor={scope === 'all'} />
              ))}
            </ol>
          )}
          <LoadMore {...list} />
        </div>
      </section>
    </div>
  );
}

function Stacks() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const { data } = useQuery({
    queryKey: keys.stacks,
    queryFn: () => api.get<HistoryStacks>('/history/stacks'),
  });
  const move = useMutation({
    mutationFn: (dir: 'undo' | 'redo') => api.post<HistoryStacks>(`/history/${dir}`),
    onSuccess: (s) => qc.setQueryData(keys.stacks, s),
    onError: (e) => {
      toast(e instanceof ApiError ? e.message : t('common.error'), 'error');
      void qc.invalidateQueries({ queryKey: keys.stacks });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['history'], refetchType: 'all' });
      for (const k of ['answers', 'comments', 'question', 'company', 'my', 'me'])
        void qc.invalidateQueries({ queryKey: [k] });
    },
  });

  // Ctrl/⌘+Z and Ctrl/⌘+Shift+Z (or Ctrl+Y) on this page, outside text fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, [contenteditable="true"]')) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      const dir = k === 'y' || (k === 'z' && e.shiftKey) ? 'redo' : k === 'z' ? 'undo' : null;
      if (!dir || move.isPending) return;
      if (!(dir === 'undo' ? data?.undo.total : data?.redo.total)) return;
      e.preventDefault();
      move.mutate(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, move]);

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <StackCard
        title={t('history.undoStack')}
        hint={t('history.undoHint')}
        stack={data?.undo}
        loading={!data}
        icon={<Undo2 size={16} />}
        action={t('history.undo')}
        shortcut={`${MOD_KEY}Z`}
        busy={move.isPending && move.variables === 'undo'}
        onAction={() => move.mutate('undo')}
      />
      <StackCard
        title={t('history.redoStack')}
        hint={t('history.redoHint')}
        stack={data?.redo}
        loading={!data}
        icon={<Redo2 size={16} />}
        action={t('history.redo')}
        shortcut={`${MOD_KEY}⇧Z`}
        busy={move.isPending && move.variables === 'redo'}
        onAction={() => move.mutate('redo')}
      />
    </div>
  );
}

function StackCard({
  title,
  hint,
  stack,
  loading,
  icon,
  action,
  shortcut,
  busy,
  onAction,
}: {
  title: string;
  hint: string;
  stack?: HistoryStacks['undo'];
  loading: boolean;
  icon: React.ReactNode;
  action: string;
  shortcut: string;
  busy: boolean;
  onAction: () => void;
}) {
  const { t, fmt } = useI18n();
  const describe = useDescribe();
  const items = stack?.items ?? [];
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="bg-surface-3 text-muted rounded-md px-1.5 py-0.5 text-xs tabular-nums">
          {stack?.total ?? 0}
        </span>
        <Button
          size="sm"
          variant="primary"
          className="ms-auto"
          disabled={!items.length}
          loading={busy}
          onClick={onAction}
          title={shortcut}
        >
          {icon} {action}
        </Button>
      </div>
      <p className="text-subtle mt-1 text-xs">{hint}</p>
      {/* Top of the stack first: that is what the button acts on. */}
      <ol className="mt-4 flex-1 space-y-1.5">
        {loading ? (
          <ListSkeleton rows={2} />
        ) : !items.length ? (
          <li className="border-border text-subtle grid h-24 place-items-center rounded-xl border border-dashed text-sm">
            {t('history.stackEmpty')}
          </li>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((e, i) => (
              <m.li
                key={e.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1 - Math.min(i, 6) * 0.1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm',
                  i === 0 ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2/60',
                )}
                style={{ marginInline: `${Math.min(i, 4) * 4}px` }}
              >
                <div className="flex items-center gap-2">
                  {i === 0 && (
                    <span className="bg-accent rounded px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase">
                      {t('history.top')}
                    </span>
                  )}
                  <span className="font-medium">{describe(e)}</span>
                  <span className="text-subtle ms-auto shrink-0 text-xs">
                    {fmt.relative(e.createdAt)}
                  </span>
                </div>
                {e.label && (
                  <p className="text-muted mt-0.5 truncate text-xs">
                    <bdi>{e.label}</bdi>
                  </p>
                )}
              </m.li>
            ))}
          </AnimatePresence>
        )}
      </ol>
      {stack && stack.total > items.length && (
        <p className="text-subtle mt-2 text-xs">
          {t('history.more', { n: stack.total - items.length })}
        </p>
      )}
    </Card>
  );
}

function LogRow({ e, showActor }: { e: HistoryEntry; showActor: boolean }) {
  const { t, fmt } = useI18n();
  const describe = useDescribe();
  const [open, setOpen] = useState(false);
  const Icon = ICONS[e.action] ?? Pencil;
  const tone =
    e.action === 'delete' || e.action === 'reject' || e.action === 'status'
      ? 'text-danger'
      : e.action === 'create' || e.action === 'approve'
        ? 'text-easy'
        : 'text-accent';
  const diff = e.action === 'edit' && (e.before || e.after);
  return (
    <li className="relative ps-6 pb-5 last:pb-0">
      <span
        className={cn(
          'bg-surface border-border absolute -start-3 top-0 grid h-6 w-6 place-items-center rounded-full border',
          tone,
        )}
      >
        <Icon size={12} />
      </span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {showActor && <UserChip user={e.actor} size={20} />}
        <span className="font-medium">{describe(e)}</span>
        {e.undo === 'undone' && (
          <span className="text-medium text-xs">· {t('history.state.undone')}</span>
        )}
        <span className="text-subtle text-xs" title={fmt.date(e.createdAt)}>
          · {fmt.relative(e.createdAt)}
        </span>
      </div>
      {e.label &&
        (e.link ? (
          <Link
            to={e.link}
            className="text-muted hover:text-fg mt-0.5 block truncate text-sm hover:underline"
          >
            <bdi>{e.label}</bdi>
          </Link>
        ) : (
          <p className="text-muted mt-0.5 truncate text-sm">
            <bdi>{e.label}</bdi>
          </p>
        ))}
      {e.detail && !['undo', 'redo'].includes(e.action) && (
        <p className="text-subtle mt-0.5 text-xs">
          <bdi>{e.detail === 'moderation' ? t('history.byModerator') : e.detail}</bdi>
        </p>
      )}
      {diff && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-accent mt-1 text-xs font-medium hover:underline"
          >
            {t(open ? 'history.hideChange' : 'history.showChange')}
          </button>
          {open && (
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <pre className="bg-danger/10 text-muted rounded-lg p-2 whitespace-pre-wrap [unicode-bidi:plaintext]">
                {e.before}
              </pre>
              <pre className="bg-easy/10 text-muted rounded-lg p-2 whitespace-pre-wrap [unicode-bidi:plaintext]">
                {e.after}
              </pre>
            </div>
          )}
        </>
      )}
    </li>
  );
}
