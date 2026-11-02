import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadMore, usePaged } from '@/lib/paged';
import { Ban, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs } from '@/components/ui/Tabs';
import { useAdminLinks } from '@/components/layout/nav';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n, type MessageKey } from '@/i18n';
import type { Permission } from '@/shared/permissions';
import { UserChip } from '@/components/ui/UserChip';
import { BanDialog } from './BanDialog';
import type { UserRef } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useCan } from '@/features/auth/Can';

type Source = 'user' | 'system';
type TargetType = 'answer' | 'comment' | 'review' | 'question' | 'message' | 'user';
interface ReportItem {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  source: 'user' | 'system';
  reporter: UserRef | null;
  target: {
    author: UserRef | null;
    authorId: string | null;
    body: string;
    deleted: boolean;
    link: string | null;
  } | null;
  createdAt: string;
}

const DELETE: Partial<Record<TargetType, { url: string; perm: Permission }>> = {
  answer: { url: '/answers/', perm: 'answers.delete_any' },
  comment: { url: '/comments/', perm: 'comments.delete_any' },
  review: { url: '/reviews/', perm: 'ratings.delete_any' },
  question: { url: '/questions/', perm: 'questions.delete_any' },
};

export function ReportsPage() {
  const { t, fmt } = useI18n();
  const can = useCan();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const source: Source = params.get('source') === 'system' ? 'system' : 'user';
  const list = usePaged<ReportItem>(
    [...keys.admin.reports, source],
    `/admin/reports?source=${source}`,
  );
  const counts = useAdminLinks();
  const countFor = (k: 'flaggedContent' | 'openReports') =>
    counts.links.find((l) => 'count' in l && l.count === k);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.admin.reports });
    void qc.invalidateQueries({ queryKey: keys.admin.counts });
  };
  const handle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'resolved' | 'dismissed' }) =>
      api.post(`/admin/reports/${id}`, { status }),
    onSuccess: refresh,
  });
  const [banning, setBanning] = useState<ReportItem | null>(null);
  const remove = useMutation({
    mutationFn: async (r: ReportItem) => {
      await api.delete(`${DELETE[r.targetType]!.url}${r.targetId}`);
      await api.post(`/admin/reports/${r.id}`, { status: 'resolved' });
    },
    onSuccess: refresh,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('admin.reports.title')}</h1>
      <Tabs<Source>
        className="mt-4"
        value={source}
        onChange={(v) => setParams(v === 'system' ? { source: 'system' } : {}, { replace: true })}
        items={[
          {
            value: 'user',
            label: t('admin.reports.fromPeople'),
            count: (() => {
              const l = countFor('openReports');
              return l ? counts.countOf(l) || undefined : undefined;
            })(),
          },
          {
            value: 'system',
            label: t('nav.flagged'),
            count: (() => {
              const l = countFor('flaggedContent');
              return l ? counts.countOf(l) || undefined : undefined;
            })(),
          },
        ]}
      />
      {source === 'system' && (
        <p className="text-subtle mt-3 text-sm">{t('admin.reports.flaggedHint')}</p>
      )}
      <div className="mt-6 space-y-3">
        {list.isLoading ? (
          <ListSkeleton />
        ) : !list.items.length ? (
          <EmptyState icon={<ShieldCheck size={20} />} title={t('admin.reports.empty')} />
        ) : (
          list.items.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Tag>{t(`report.target.${r.targetType}` as MessageKey)}</Tag>
                {r.source === 'system' ? (
                  <Tag className="text-medium">{t('admin.reports.system')}</Tag>
                ) : (
                  r.reporter && <UserChip user={r.reporter} size={18} />
                )}
                <span className="text-subtle text-xs">· {fmt.relative(r.createdAt)}</span>
                {r.target?.link && (
                  <Link
                    to={r.target.link}
                    className="text-accent ms-auto flex items-center gap-1 hover:underline"
                  >
                    {t('admin.reports.open')} <ExternalLink size={12} />
                  </Link>
                )}
              </div>
              {r.reason && (
                <p className="mt-2 text-sm font-medium" dir="auto">
                  “{r.reason}”
                </p>
              )}
              {r.target && (
                <blockquote className="border-border-strong bg-surface-2 text-muted mt-3 rounded-xl border-s-2 p-3 text-sm whitespace-pre-line">
                  <span className="mb-1 block text-xs">
                    <UserChip user={r.target.author} size={18} />
                  </span>
                  {r.targetType === 'user'
                    ? null
                    : r.target.deleted
                      ? t('common.deleted')
                      : r.target.body}
                </blockquote>
              )}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handle.mutate({ id: r.id, status: 'dismissed' })}
                >
                  {t('admin.reports.dismiss')}
                </Button>
                <Button size="sm" onClick={() => handle.mutate({ id: r.id, status: 'resolved' })}>
                  {t('admin.reports.resolve')}
                </Button>
                {can('users.ban') &&
                  r.target?.authorId &&
                  r.target.author?.role?.kind !== 'founder' && (
                    <Button size="sm" variant="danger" onClick={() => setBanning(r)}>
                      <Ban size={14} /> {t('admin.users.ban')}
                    </Button>
                  )}
                {DELETE[r.targetType] && can(DELETE[r.targetType]!.perm) && !r.target?.deleted && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => remove.mutate(r)}
                    loading={remove.isPending && remove.variables?.id === r.id}
                  >
                    {t('admin.reports.deleteContent')}
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
        <LoadMore {...list} />
      </div>
      {banning?.target?.authorId && (
        <BanDialog
          key={banning.id}
          open
          userId={banning.target.authorId}
          username={banning.target.author?.username ?? ''}
          defaultLink={banning.target.link ?? ''}
          onClose={() => setBanning(null)}
          onDone={() => handle.mutate({ id: banning.id, status: 'resolved' })}
        />
      )}
    </div>
  );
}
