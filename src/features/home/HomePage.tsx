import { useQuery } from '@tanstack/react-query';
import { m } from 'framer-motion';
import { ArrowRight, CalendarDays, Flame, History, Lightbulb, PenLine, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { keys } from '@/lib/keys';
import { storage } from '@/lib/storage';
import { useI18n } from '@/i18n';
import type { QuestionSummary } from '@/shared/types';
import { ButtonLink } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { useMe } from '@/features/auth/useMe';
import { useCompanies } from '@/features/companies/api';
import { CompanyCard } from '@/features/companies/CompanyCard';
import { QuestionRow } from '@/features/questions/QuestionRow';
import { QuestionTags } from '@/features/questions/QuestionTags';
import type { LastViewed } from '@/features/questions/QuestionPage';
import { MOD_KEY } from '@/lib/platform';

interface Progress {
  company: { slug: string; name: string; nameAr: string; logoUrl: string };
  studied: number;
  total: number;
}

export function HomePage() {
  const { t, fmt, companyName } = useI18n();
  const { me } = useMe();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const companies = useCompanies('', 'popular');
  const recent = useQuery({
    queryKey: keys.recent,
    queryFn: () => api.get<{ items: QuestionSummary[] }>('/questions/recent'),
  });
  const daily = useQuery({
    queryKey: keys.daily,
    queryFn: () => api.get<{ question: QuestionSummary | null }>('/questions/daily'),
    staleTime: 30 * 60_000,
  });
  const progress = useQuery({
    queryKey: keys.my('progress'),
    queryFn: () => api.get<{ items: Progress[] }>('/me/progress'),
    enabled: Boolean(me),
  });
  const last = storage.get<LastViewed | null>('mk.lastViewed', null);

  const all = companies.data?.items ?? [];
  const totalQuestions = all.reduce((s, c) => s + c.questionCount, 0);
  const dq = daily.data?.question;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="relative py-14 sm:py-20">
        <m.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-3xl"
        >
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
            <span className="from-fg bg-gradient-to-br to-[color-mix(in_oklab,var(--fg)_55%,var(--accent))] bg-clip-text text-transparent">
              {t('home.hero')}
            </span>
          </h1>
          <p className="text-muted mt-5 max-w-2xl text-lg">
            {t('home.heroSub', { n: all.length || '30+' })}
          </p>
          <form
            className="relative mt-8 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              nav(`/companies${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
            }}
          >
            <Search
              size={18}
              className="text-subtle pointer-events-none absolute start-4 top-1/2 -translate-y-1/2"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="h-13 rounded-2xl ps-12 text-base"
              aria-label={t('home.searchPlaceholder')}
            />
            <kbd className="border-border text-subtle absolute end-4 top-1/2 hidden -translate-y-1/2 rounded-md border px-1.5 text-[11px] sm:block">
              {MOD_KEY}K
            </kbd>
          </form>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {[
              [fmt.number(totalQuestions), t('home.stat.questions')],
              [fmt.number(all.length), t('home.stat.companies')],
              ['100%', t('home.stat.free')],
            ].map(([n, l], i) => (
              <m.div
                key={l}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
              >
                <span className="text-fg text-2xl font-semibold tabular-nums">{n}</span>{' '}
                <span className="text-muted">{l}</span>
              </m.div>
            ))}
          </div>
        </m.div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Question of the day */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="relative h-full overflow-hidden p-6">
            <div className="bg-accent pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full opacity-10 blur-3xl" />
            <div className="text-accent flex items-center gap-2 text-sm font-medium">
              <Lightbulb size={16} /> {t('home.daily')}
            </div>
            {daily.isLoading ? (
              <Skeleton className="mt-4 h-16" />
            ) : dq && dq.company ? (
              <Link to={`/c/${dq.company.slug}/${dq.slug}`} className="group mt-3 block">
                <h2 className="group-hover:text-accent text-xl font-semibold">{dq.title}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <CompanyLogo name={dq.company.name} size={22} className="rounded-md" />
                  <span className="me-1 text-sm">{companyName(dq.company)}</span>
                  <QuestionTags q={dq} />
                </div>
                <p className="text-muted mt-4 text-sm">{t('home.dailySub')}</p>
                <span className="text-accent mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  {t('companies.view')}{' '}
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
                  />
                </span>
              </Link>
            ) : null}
          </Card>
        </m.div>

        {/* Personal panel */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <Card className="h-full space-y-4 p-6">
            {me ? (
              <>
                <div className="flex items-center gap-3">
                  <m.span
                    animate={me.streak.current ? { scale: [1, 1.15, 1] } : undefined}
                    transition={{ repeat: Infinity, repeatDelay: 2.5, duration: 0.6 }}
                    className="text-medium grid h-11 w-11 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--medium)_16%,transparent)]"
                  >
                    <Flame size={22} />
                  </m.span>
                  <div>
                    <p className="font-semibold">
                      {me.streak.current
                        ? t('home.streak', { n: me.streak.current })
                        : t('home.streakZero')}
                    </p>
                    <p className="text-subtle text-xs">
                      {t('profile.longest')}: {t('profile.days', { n: me.streak.longest })}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionTitle>{t('home.progress')}</SectionTitle>
                  {progress.data?.items.length ? (
                    progress.data.items.slice(0, 3).map((p) => (
                      <Link
                        key={p.company.slug}
                        to={`/c/${p.company.slug}`}
                        className="hover:bg-surface-2 flex items-center gap-3 rounded-xl p-1.5"
                      >
                        <ProgressRing value={p.studied} total={p.total} size={36} stroke={3} />
                        <span className="flex-1 truncate text-sm">{companyName(p.company)}</span>
                        <span className="text-subtle text-xs tabular-nums">
                          {p.studied}/{p.total}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-muted text-sm">{t('profile.noProgress')}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col justify-center">
                <p className="font-semibold">{t('privacy.title')}</p>
                <p className="text-muted mt-2 text-sm">{t('privacy.body')}</p>
                <ButtonLink to="/login" variant="primary" className="mt-4 self-start">
                  {t('nav.signIn')}
                </ButtonLink>
              </div>
            )}
            {last && (
              <Link
                to={`/c/${last.companySlug}/${last.slug}`}
                className="border-border hover:border-border-strong flex items-center gap-3 rounded-xl border p-3"
              >
                <History size={16} className="text-accent shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-subtle block text-xs">{t('home.continue')}</span>
                  <span className="block truncate text-sm font-medium">{last.title}</span>
                </span>
                <ArrowRight size={14} className="text-subtle rtl:-scale-x-100" />
              </Link>
            )}
          </Card>
        </m.div>
      </div>

      <section className="mt-14">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold">{t('home.popular')}</h2>
          <Link to="/companies" className="text-accent text-sm hover:underline">
            {t('home.viewAll')}
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.isLoading
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
            : all.slice(0, 6).map((c, i) => <CompanyCard key={c.id} c={c} index={i} />)}
        </div>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <CalendarDays size={18} className="text-accent" /> {t('home.recent')}
          </h2>
          {recent.isLoading ? (
            <ListSkeleton rows={4} />
          ) : (
            <div className="space-y-2.5">
              {recent.data?.items.map((r) => (
                <QuestionRow
                  key={r.id}
                  q={r}
                  companySlug={r.company?.slug ?? ''}
                  showCompany={r.company ? companyName(r.company) : undefined}
                />
              ))}
            </div>
          )}
        </div>
        <Card className="h-fit p-6 lg:sticky lg:top-24">
          <span className="bg-accent-soft text-accent grid h-11 w-11 place-items-center rounded-2xl">
            <PenLine size={20} />
          </span>
          <h3 className="mt-4 text-lg font-semibold">{t('home.contributeTitle')}</h3>
          <p className="text-muted mt-2 text-sm">{t('home.contributeBody')}</p>
          <ButtonLink to="/contribute" variant="primary" className="mt-5 w-full">
            {t('nav.contribute')}
          </ButtonLink>
        </Card>
      </section>
    </div>
  );
}
