import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n } from '@/i18n';
import type {
  AnswerActivity,
  CompanySubmission,
  FeedbackActivity,
  PublicProfile,
  QuestionSummary,
} from '@/shared/types';
import { LoadMore, usePaged } from '@/lib/paged';
import { ListSkeleton, PageSkeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { Card, SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { RoleBadge } from '@/components/ui/UserChip';
import { NotFoundPage } from '@/components/layout/NotFoundPage';
import { QuestionRow } from '@/features/questions/QuestionRow';
import { BadgeList } from './BadgeList';
import { Mail } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Can } from '@/features/auth/Can';
import { useMe } from '@/features/auth/useMe';
import { ReportButton } from '@/features/reports/ReportButton';
import { AnswerList } from './MyProfilePage';
import { CompanyList, FeedbackList } from './ContributionLists';

type Tab = 'questions' | 'answers' | 'feedback' | 'companies';

/** Public view: username, role, reputation, badges, join month and contributions. */
export function PublicProfilePage() {
  const { username = '' } = useParams();
  const { t, fmt } = useI18n();
  const [params, setParams] = useSearchParams();
  const { me } = useMe();
  const { data, isLoading, error } = useQuery({
    queryKey: keys.profile(username),
    queryFn: () => api.get<PublicProfile>(`/users/${username}`),
  });
  if (isLoading) return <PageSkeleton />;
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
  if (!data) return null;
  const tab = (params.get('tab') as Tab) || 'questions';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={data.username} avatar={data.avatar} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            @{data.username} <RoleBadge role={data.role} className="text-xs" />
          </h1>
          <p className="text-muted text-sm">
            {t('profile.reputation')}:{' '}
            <span className="text-fg font-medium">{fmt.number(data.reputation)}</span> ·{' '}
            {t('profile.joined', { m: fmt.month(data.joinedAt) })}
          </p>
        </div>
        {me && me.id !== data.id && (
          <div className="flex gap-1">
            <Can permission="messages.send_any">
              <ButtonLink to={`/inbox/new?to=${data.username}`} variant="soft" size="sm">
                <Mail size={15} /> {t('profile.message')}
              </ButtonLink>
            </Can>
            <ReportButton targetType="user" targetId={data.id} label={t('profile.report')} />
          </div>
        )}
      </header>
      {data.badges.length > 0 && (
        <Card className="mt-6 p-5">
          <SectionTitle className="mb-4">{t('profile.badges')}</SectionTitle>
          <BadgeList earned={data.badges} showLocked={false} />
        </Card>
      )}
      <Tabs<Tab>
        className="mt-8"
        value={tab}
        onChange={(v) => setParams(v === 'questions' ? {} : { tab: v }, { replace: true })}
        items={[
          { value: 'questions', label: t('profile.questions'), count: data.counts.questions },
          { value: 'answers', label: t('profile.publicAnswers'), count: data.counts.answers },
          { value: 'feedback', label: t('profile.feedback'), count: data.counts.feedback },
          { value: 'companies', label: t('profile.companies'), count: data.counts.companies },
        ]}
      />
      <div className="mt-6">
        <ProfileTab key={tab} username={data.username} tab={tab} />
      </div>
    </div>
  );
}

function ProfileTab({ username, tab }: { username: string; tab: Tab }) {
  const { t, companyName } = useI18n();
  const list = usePaged<unknown>(['profile', username, tab], `/users/${username}/${tab}`);
  if (list.isLoading) return <ListSkeleton />;
  return (
    <>
      {tab === 'questions' &&
        (list.items.length ? (
          <div className="space-y-2.5">
            {(list.items as QuestionSummary[]).map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                companySlug={q.company?.slug ?? ''}
                showCompany={q.company ? companyName(q.company) : undefined}
              />
            ))}
          </div>
        ) : (
          <EmptyState title={t('profile.noQuestions')} />
        ))}
      {tab === 'answers' && <AnswerList items={list.items as AnswerActivity[]} />}
      {tab === 'feedback' && <FeedbackList items={list.items as FeedbackActivity[]} />}
      {tab === 'companies' && <CompanyList items={list.items as CompanySubmission[]} />}
      <LoadMore {...list} />
    </>
  );
}
