import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { m } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '@/lib/api';
import { keys } from '@/lib/keys';
import { LoadMore } from '@/lib/paged';
import { useI18n, type MessageKey } from '@/i18n';
import type { Notification, Page } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

function linkFor(n: Notification) {
  const d = n.data;
  if (d.companySlug && d.questionSlug) return `/c/${d.companySlug}/${d.questionSlug}`;
  if (n.type === 'comment.reply' && d.companySlug) return `/c/${d.companySlug}?tab=feedback`;
  if (n.type === 'question.rejected') return '/me?tab=submissions';
  if (n.type === 'company.approved' && d.companySlug) return `/c/${d.companySlug}`;
  if (n.type === 'company.rejected') return '/me?tab=companies';
  if (n.type.startsWith('message.') && d.conversationId) return `/inbox/${d.conversationId}`;
  if (n.type === 'badge.awarded') return '/me';
  return null;
}

export function NotificationsPage() {
  const { t, fmt } = useI18n();
  const qc = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: keys.notifications,
    queryFn: ({ pageParam }) =>
      api.get<Page<Notification>>(`/me/notifications${qs({ cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  });
  const read = useMutation({
    mutationFn: () => api.post('/me/notifications/read'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.me }),
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const hasUnread = items.some((n) => !n.read);

  // Opening the page marks everything as read (after it renders unread highlights once).
  useEffect(() => {
    if (hasUnread) {
      const tm = setTimeout(() => read.mutate(), 1200);
      return () => clearTimeout(tm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('notif.title')}</h1>
        {hasUnread && (
          <Button variant="ghost" size="sm" onClick={() => read.mutate()}>
            <CheckCheck size={16} /> {t('notif.markRead')}
          </Button>
        )}
      </div>
      <div className="mt-6">
        {q.isLoading ? (
          <ListSkeleton rows={4} />
        ) : !items.length ? (
          <EmptyState icon={<Bell size={20} />} title={t('notif.empty')} />
        ) : (
          <ul className="space-y-2">
            {items.map((n, i) => {
              const href = linkFor(n);
              const data = {
                ...n.data,
                badge: n.data.badge ? t(`badge.${n.data.badge}` as MessageKey) : undefined,
              };
              const body = (
                <div
                  className={cn(
                    'flex gap-3 rounded-2xl border p-4 transition-colors',
                    n.read
                      ? 'border-border bg-surface'
                      : 'bg-accent-soft border-[color-mix(in_oklab,var(--accent)_35%,var(--border))]',
                  )}
                >
                  {!n.read && <span className="bg-accent mt-2 h-2 w-2 shrink-0 rounded-full" />}
                  <div className="flex-1">
                    <p className="text-sm">{t(`notif.${n.type}` as MessageKey, data)}</p>
                    <p className="text-subtle mt-1 text-xs">{fmt.relative(n.createdAt)}</p>
                  </div>
                </div>
              );
              return (
                <m.li
                  key={n.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.025 }}
                >
                  {href ? <Link to={href}>{body}</Link> : body}
                </m.li>
              );
            })}
          </ul>
        )}
        <LoadMore {...q} />
      </div>
    </div>
  );
}
