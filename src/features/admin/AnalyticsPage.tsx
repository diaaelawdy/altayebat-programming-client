import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, FileQuestion, Library, MessageSquare, Star, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface Analytics {
  users: { total: number; thisWeek: number };
  questions: {
    live: number;
    submitted: number;
    submittedThisWeek: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  comments: { total: number; answers: number; companyComments: number };
  reviews: number;
}

/** Site totals for Founders and roles with `analytics.view`. */
export function AnalyticsPage() {
  const { t, fmt } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: keys.admin.analytics,
    queryFn: () => api.get<Analytics>('/admin/analytics'),
    refetchInterval: 60_000,
  });
  const n = (v: number) => fmt.number(v);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('nav.analytics')}</h1>
      <p className="text-subtle mt-1 text-sm">{t('analytics.subtitle')}</p>
      {isLoading || !data ? (
        <ListSkeleton className="mt-6" />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            icon={<Users size={18} />}
            label={t('analytics.users')}
            value={n(data.users.total)}
            hint={t('analytics.usersHint', { n: n(data.users.thisWeek) })}
          />
          <Stat
            icon={<FileQuestion size={18} />}
            label={t('analytics.submitted')}
            value={n(data.questions.submitted)}
            hint={t('analytics.submittedHint', { n: n(data.questions.submittedThisWeek) })}
          />
          <Stat
            icon={<CheckCircle2 size={18} />}
            label={t('analytics.approved')}
            value={n(data.questions.approved)}
            hint={t('analytics.approvedHint', {
              pending: n(data.questions.pending),
              rejected: n(data.questions.rejected),
            })}
          />
          <Stat
            icon={<MessageSquare size={18} />}
            label={t('analytics.comments')}
            value={n(data.comments.total)}
            hint={t('analytics.commentsHint', {
              answers: n(data.comments.answers),
              company: n(data.comments.companyComments),
            })}
          />
          <Stat
            icon={<Library size={18} />}
            label={t('analytics.live')}
            value={n(data.questions.live)}
            hint={t('analytics.liveHint')}
          />
          <Stat icon={<Star size={18} />} label={t('analytics.reviews')} value={n(data.reviews)} />
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-muted flex items-center gap-2 text-sm">
        <span className="text-accent">{icon}</span> {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-subtle mt-1 text-xs">{hint}</p>}
    </Card>
  );
}
