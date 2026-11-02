import { BriefcaseBusiness, ExternalLink } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { ListSkeleton, PageSkeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { NotFoundPage } from '@/components/layout/NotFoundPage';
import { useI18n } from '@/i18n';
import { useMe } from '@/features/auth/useMe';
import { FilterBar } from '@/features/questions/FilterBar';
import { QuestionList } from '@/features/questions/QuestionList';
import { RatingInline } from '@/features/ratings/RatingInline';
import { ApiError } from '@/lib/api';
import { useCompany } from './api';
import { ReviewedBy, UserChip } from '@/components/ui/UserChip';
import { ExtLink } from '@/components/ui/ExtLink';

const FeedbackTab = lazy(() => import('./FeedbackTab'));
const RatingsTab = lazy(() =>
  import('@/features/ratings/RatingsTab').then((m) => ({ default: m.RatingsTab })),
);

type Tab = 'questions' | 'feedback' | 'ratings';

export function CompanyPage() {
  const { slug = '' } = useParams();
  const { t, fmt, companyName } = useI18n();
  const { me } = useMe();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'questions';
  const { data: c, isLoading, error } = useCompany(slug);

  if (isLoading) return <PageSkeleton />;
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
  if (!c) return null;

  const setTab = (v: Tab) => setParams(v === 'questions' ? {} : { tab: v }, { replace: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={64} className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{companyName(c)}</h1>
          <div className="text-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {c.industry && <span>{c.industry}</span>}
            <span>{t('companies.questions', { n: fmt.number(c.questionCount) })}</span>
            {c.lastUpdatedAt && (
              <span>{t('companies.updated', { t: fmt.relative(c.lastUpdatedAt) })}</span>
            )}
            <RatingInline rating={c.rating} />
            {c.website && (
              <ExtLink
                href={c.website}
                icon={<ExternalLink size={13} />}
                label={t('company.website')}
              />
            )}
            {c.linkedinUrl && (
              <ExtLink
                href={c.linkedinUrl}
                icon={<BriefcaseBusiness size={13} />}
                label={t('company.linkedin')}
              />
            )}
          </div>
          {(c.createdBy || c.review?.by) && (
            <div className="text-subtle mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {c.createdBy && (
                <p className="flex items-center gap-2">
                  {t('company.addedBy')} <UserChip user={c.createdBy} size={20} />
                </p>
              )}
              <ReviewedBy review={c.review} />
            </div>
          )}
        </div>
        {me && c.questionCount > 0 && (
          <div className="border-border bg-surface flex items-center gap-3 rounded-2xl border px-4 py-3">
            <ProgressRing value={c.studied ?? 0} total={c.questionCount} size={48} />
            <span className="text-muted text-sm">
              {t('company.studied', { a: c.studied ?? 0, b: c.questionCount })}
            </span>
          </div>
        )}
      </header>

      <Tabs<Tab>
        className="mt-8"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'questions', label: t('company.tab.questions'), count: c.questionCount },
          { value: 'feedback', label: t('company.tab.feedback'), count: c.commentCount },
          { value: 'ratings', label: t('company.tab.ratings'), count: c.rating.count },
        ]}
      />

      <div className="mt-6">
        {tab === 'questions' && (
          <div className="space-y-5">
            <FilterBar />
            <QuestionList companySlug={c.slug} />
          </div>
        )}
        <Suspense fallback={<ListSkeleton rows={3} />}>
          {tab === 'feedback' && <FeedbackTab slug={c.slug} />}
          {tab === 'ratings' && <RatingsTab company={c} />}
        </Suspense>
      </div>
    </div>
  );
}
