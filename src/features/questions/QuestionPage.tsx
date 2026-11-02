import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Copy,
  Flame,
  Focus,
  Hand,
  Keyboard,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ReviewedBy, UserChip } from '@/components/ui/UserChip';
import { ReportButton } from '@/features/reports/ReportButton';
import { Tag } from '@/components/ui/Badges';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { Markdown } from '@/components/ui/Markdown';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { NotFoundPage } from '@/components/layout/NotFoundPage';
import { useI18n } from '@/i18n';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { storage } from '@/lib/storage';
import { useHotkeys } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import type { QuestionDetail, QuestionSummary } from '@/shared/types';
import { useMe } from '@/features/auth/useMe';
import { useCan } from '@/features/auth/Can';
import { SolutionEditor } from '@/features/editor/SolutionEditor';
import { Thread } from '@/features/threads/Thread';
import { answerThread } from '@/features/threads/api';
import { AddToList } from '@/features/study/AddToList';
import { useCompany } from '@/features/companies/api';
import { filtersFrom, prefetchQuestion, useQuestion, useStudyToggle } from './api';
import { AskedDialog } from './AskedDialog';
import { EditTagsDialog } from './EditTagsDialog';
import { QuestionTags } from './QuestionTags';
import { Confetti } from './Confetti';
import { QuestionRow } from './QuestionRow';
import { useConfirm } from '@/components/ui/confirmContext';

export interface LastViewed {
  companySlug: string;
  slug: string;
  title: string;
  companyName: string;
  at: number;
}

export function QuestionPage() {
  const confirm = useConfirm();
  const { slug = '', qslug = '' } = useParams();
  const [params] = useSearchParams();
  const ctx = useMemo(() => filtersFrom(params), [params]);
  const { data: q, isLoading, error } = useQuestion(slug, qslug, ctx);
  const { data: company } = useCompany(slug);
  const { t, fmt, companyName } = useI18n();
  const { me } = useMe();
  const can = useCan();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [focus, setFocus] = useState(false);
  const [askedOpen, setAskedOpen] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [nextUp, setNextUp] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const bookmark = useStudyToggle('bookmark');
  const studied = useStudyToggle('studied');
  const search = params.toString() ? `?${params.toString()}` : '';

  // Remember for "Continue where you left off" (device-local convenience).
  useEffect(() => {
    if (q)
      storage.set('mk.lastViewed', {
        companySlug: slug,
        slug: q.slug,
        title: q.title,
        companyName: q.company.name,
        at: Date.now(),
      } satisfies LastViewed);
  }, [q, slug]);

  useEffect(() => {
    setNextUp(false);
  }, [qslug]);

  // Prefetch neighbors so J/K feels instant.
  useEffect(() => {
    if (q?.next) prefetchQuestion(qc, slug, q.next.slug, ctx);
    if (q?.prev) prefetchQuestion(qc, slug, q.prev.slug, ctx);
  }, [q?.next, q?.prev, qc, slug, ctx]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-focus', focus);
    return () => document.documentElement.removeAttribute('data-focus');
  }, [focus]);

  const go = (target: { slug: string } | null) =>
    target && nav(`/c/${slug}/${target.slug}${search}`);
  const signedIn = Boolean(me);

  const toggleStudied = () => {
    if (!q || !signedIn) return;
    const on = !q.studied;
    studied.mutate(
      { id: q.id, on, companySlug: slug },
      {
        onSuccess: (r) => {
          if (!on) return;
          if (
            company &&
            r.companyStudied !== undefined &&
            r.companyStudied >= company.questionCount
          )
            setConfetti(Date.now());
          if (q.next) setNextUp(true);
        },
      },
    );
  };
  const toggleBookmark = () => q && signedIn && bookmark.mutate({ id: q.id, on: !q.bookmarked });

  useHotkeys(
    {
      j: () => go(q?.next ?? null),
      k: () => go(q?.prev ?? null),
      b: toggleBookmark,
      s: toggleStudied,
      f: () => setFocus((f) => !f),
      escape: () => setFocus(false),
    },
    Boolean(q),
  );

  if (isLoading) return <PageSkeleton />;
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
  if (!q) return null;

  const studiedCount = company?.studied ?? 0;

  return (
    <div
      className={cn(
        'mx-auto px-4 py-6 transition-[max-width] duration-300',
        focus ? 'max-w-4xl' : 'max-w-6xl',
      )}
    >
      <Confetti fire={confetti} />
      <nav className="text-muted mb-5 flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        <Link to={`/c/${slug}${search}`} className="hover:text-fg flex items-center gap-2">
          <ArrowLeft size={15} className="rtl:-scale-x-100" />
          <CompanyLogo
            name={q.company.name}
            logoUrl={q.company.logoUrl}
            size={22}
            className="rounded-md"
          />
          {companyName(q.company)}
        </Link>
        <span className="ms-auto flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(q.prev)}
            disabled={!q.prev}
            aria-label={t('common.previous')}
            title={q.prev?.title}
          >
            <ArrowLeft size={15} className="rtl:-scale-x-100" />{' '}
            <span className="hidden sm:inline">K</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(q.next)}
            disabled={!q.next}
            aria-label={t('common.next')}
            title={q.next?.title}
          >
            <span className="hidden sm:inline">J</span>{' '}
            <ArrowRight size={15} className="rtl:-scale-x-100" />
          </Button>
          <Button
            variant={focus ? 'soft' : 'ghost'}
            size="sm"
            onClick={() => setFocus((f) => !f)}
            aria-pressed={focus}
          >
            <Focus size={15} />{' '}
            <span className="hidden sm:inline">{focus ? t('q.exitFocus') : t('q.focus')}</span>
          </Button>
        </span>
      </nav>

      <div className={cn('grid gap-8', !focus && 'lg:grid-cols-[minmax(0,1fr)_300px]')}>
        <div className="min-w-0 space-y-8">
          <m.article
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <header>
              <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                {q.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <QuestionTags q={q} />
                <Tag className="flex items-center gap-1">
                  <Flame size={12} className="text-medium" />{' '}
                  {t('q.timesAsked', { n: q.timesAsked })}
                </Tag>
                <Tag>{t('q.lastAsked', { t: fmt.relative(q.lastAskedAt) })}</Tag>
              </div>
              <p className="text-muted mt-3 text-sm">
                {t('q.summary', {
                  company: companyName(q.company),
                  stage: q.stage,
                  n: q.timesAsked,
                  month: fmt.month(q.lastAskedAt),
                })}
              </p>
            </header>

            <Section title={t('q.problem')}>
              <Markdown html={q.problemHtml} />
            </Section>

            {q.examples.length > 0 && (
              <Section title={t('q.examples')}>
                <div className="space-y-3">
                  {q.examples.map((ex, i) => (
                    <ExampleBlock key={i} n={i + 1} ex={ex} />
                  ))}
                </div>
              </Section>
            )}

            {q.constraints.length > 0 && (
              <Section title={t('q.constraints')}>
                <ul className="space-y-1.5">
                  {q.constraints.map((c, i) => (
                    <li key={i} className="flex gap-2 text-[15px]">
                      <span className="bg-accent mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {q.lookForHtml && (
              <Section title={t('q.lookFor')} accent>
                <Markdown html={q.lookForHtml} />
              </Section>
            )}

            {q.followUps.length > 0 && (
              <Section title={t('q.followUps')}>
                <ol className="space-y-2">
                  {q.followUps.map((f, i) => (
                    <li key={i} className="flex gap-3 text-[15px]">
                      <span className="bg-surface-3 text-muted grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{f}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            <div className="text-subtle mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {q.author && (
                <p className="flex items-center gap-2">
                  {t('q.contributedBy')} <UserChip user={q.author} size={20} />
                </p>
              )}
              <ReviewedBy review={q.review} />
              <span className="ms-auto flex items-center gap-1">
                <ReportButton targetType="question" targetId={q.id} compact />
                {can('questions.edit_any') && (
                  <button
                    onClick={() => setEditingTags(true)}
                    className="text-subtle hover:text-fg rounded p-0.5"
                    aria-label={t('q.editTags')}
                    title={t('q.editTags')}
                  >
                    <Pencil size={15} />
                  </button>
                )}
                {can('questions.delete_any') && (
                  <button
                    onClick={async () => {
                      if (!(await confirm({ title: t('q.delete'), body: t('q.deleteConfirm') })))
                        return;
                      try {
                        await api.delete(`/questions/${q.id}`);
                        toast(t('q.deleted'));
                        void qc.invalidateQueries({ queryKey: ['questions'] });
                        void qc.invalidateQueries({ queryKey: keys.company(slug) });
                        nav(`/c/${slug}`, { replace: true });
                      } catch (e) {
                        toast(e instanceof ApiError ? e.message : t('common.error'), 'error');
                      }
                    }}
                    className="text-subtle hover:text-danger rounded p-0.5"
                    aria-label={t('q.delete')}
                    title={t('q.delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </span>
            </div>
          </m.article>

          <AnimatePresence>
            {nextUp && q.next && (
              <m.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              >
                <Link
                  to={`/c/${slug}/${q.next.slug}${search}`}
                  className="group bg-accent-soft flex items-center gap-4 rounded-2xl border border-[color-mix(in_oklab,var(--accent)_40%,transparent)] p-4"
                >
                  <Sparkles className="text-accent shrink-0" size={20} />
                  <div className="min-w-0 flex-1">
                    <p className="text-accent text-xs font-semibold tracking-wider uppercase">
                      {t('q.nextUp')}
                    </p>
                    <p className="truncate font-medium">{q.next.title}</p>
                  </div>
                  <kbd className="border-border text-muted rounded-md border px-1.5 text-xs">J</kbd>
                  <ArrowRight
                    size={18}
                    className="text-accent transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
                  />
                </Link>
              </m.div>
            )}
          </AnimatePresence>

          <SolutionEditor
            questionId={q.id}
            defaultLang={q.topics.includes('SQL & Databases') ? 'sql' : 'python'}
            onPosted={() => threadRef.current?.scrollIntoView({ behavior: 'smooth' })}
          />

          {!focus && (
            <div ref={threadRef} className="scroll-mt-24">
              <Thread
                cfg={answerThread(q.id)}
                title={`${t('thread.answers')} · ${q.answerCount}`}
                emptyText={t('thread.empty')}
                placeholder={t('thread.write')}
              />
            </div>
          )}

          {!focus && <Related q={q} />}
        </div>

        {!focus && (
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Study tools">
            <Card className="space-y-2 p-4">
              {signedIn ? (
                <>
                  <Button
                    variant={q.studied ? 'soft' : 'primary'}
                    className="w-full justify-start"
                    onClick={toggleStudied}
                    aria-pressed={q.studied}
                  >
                    <m.span
                      key={String(q.studied)}
                      initial={{ scale: 0.4, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    >
                      <CheckCircle2 size={16} />
                    </m.span>
                    {q.studied ? t('q.studied') : t('q.markStudied')}
                    <kbd className="ms-auto rounded border border-current/30 px-1 text-[10px] opacity-70">
                      S
                    </kbd>
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={toggleBookmark}
                    aria-pressed={q.bookmarked}
                  >
                    <Bookmark size={16} className={cn(q.bookmarked && 'fill-accent text-accent')} />
                    {q.bookmarked ? t('q.bookmarked') : t('q.bookmark')}
                    <kbd className="border-border text-subtle ms-auto rounded border px-1 text-[10px]">
                      B
                    </kbd>
                  </Button>
                  <AddToList questionId={q.id} />
                  {can('questions.create') && (
                    <Button
                      className="w-full justify-start"
                      onClick={() => setAskedOpen(true)}
                      disabled={q.askedByMe}
                    >
                      <Hand size={16} /> {q.askedByMe ? t('asked.done') : t('asked.button')}
                    </Button>
                  )}
                </>
              ) : (
                <ButtonLink
                  to={`/login?next=/c/${slug}/${q.slug}`}
                  variant="primary"
                  className="w-full"
                >
                  {t('nav.signIn')}
                </ButtonLink>
              )}
            </Card>

            {signedIn && company && company.questionCount > 0 && (
              <Card className="flex items-center gap-3 p-4">
                <ProgressRing value={studiedCount} total={company.questionCount} size={52} />
                <div className="text-sm">
                  <p className="font-medium">{companyName(company)}</p>
                  <p className="text-muted">
                    {t('company.studied', { a: studiedCount, b: company.questionCount })}
                  </p>
                </div>
              </Card>
            )}

            <Card className="space-y-2 p-4 text-sm">
              {q.prev && (
                <Link
                  to={`/c/${slug}/${q.prev.slug}${search}`}
                  className="text-muted hover:bg-surface-2 hover:text-fg flex items-center gap-2 rounded-lg p-2"
                >
                  <ArrowLeft size={14} className="shrink-0 rtl:-scale-x-100" />{' '}
                  <span className="truncate">{q.prev.title}</span>
                </Link>
              )}
              {q.next && (
                <Link
                  to={`/c/${slug}/${q.next.slug}${search}`}
                  className="text-muted hover:bg-surface-2 hover:text-fg flex items-center gap-2 rounded-lg p-2"
                >
                  <span className="flex-1 truncate">{q.next.title}</span>{' '}
                  <ArrowRight size={14} className="shrink-0 rtl:-scale-x-100" />
                </Link>
              )}
              <p className="border-border text-subtle flex items-start gap-2 border-t px-2 pt-3 text-xs">
                <Keyboard size={14} className="mt-0.5 shrink-0" /> {t('q.shortcuts')}
              </p>
            </Card>
            <CopyLink toast={toast} label={t('common.copy')} done={t('common.copied')} />
          </aside>
        )}
      </div>
      <AskedDialog
        key={q.id}
        open={askedOpen}
        onClose={() => setAskedOpen(false)}
        questionId={q.id}
        defaultStage={q.stage}
      />
      {editingTags && (
        <EditTagsDialog questionId={q.id} initial={q} onClose={() => setEditingTags(false)} />
      )}
    </div>
  );
}

function Section({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={cn(
        'mt-8',
        accent &&
          'rounded-2xl border border-[color-mix(in_oklab,var(--accent)_25%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_5%,var(--surface))] p-5',
      )}
    >
      <SectionTitle className={cn('mb-3', accent && 'text-accent')}>{title}</SectionTitle>
      {children}
    </section>
  );
}

function ExampleBlock({ n, ex }: { n: number; ex: QuestionDetail['examples'][number] }) {
  const { t } = useI18n();
  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div className="border-border bg-surface-2 text-muted border-b px-4 py-2 text-xs font-medium">
        {t('q.example', { n })}
      </div>
      <div className="bg-border grid gap-px sm:grid-cols-2" dir="ltr">
        <div className="bg-surface p-4">
          <p className="text-subtle mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
            {t('q.input')}
          </p>
          <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
            {ex.input}
          </pre>
        </div>
        <div className="bg-surface p-4">
          <p className="text-subtle mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
            {t('q.output')}
          </p>
          <pre className="text-accent font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
            {ex.output}
          </pre>
        </div>
      </div>
      {ex.explanation && (
        <p className="border-border bg-surface text-muted border-t px-4 py-3 text-sm">
          <span className="text-fg font-medium">{t('q.explanation')}: </span>
          {ex.explanation}
        </p>
      )}
    </div>
  );
}

function Related({ q }: { q: QuestionDetail }) {
  const { t, companyName } = useI18n();
  const { data } = useQuery({
    queryKey: keys.related(q.id),
    queryFn: () => api.get<{ items: QuestionSummary[] }>(`/questions/${q.id}/related`),
    staleTime: 5 * 60_000,
  });
  if (!data?.items.length) return null;
  return (
    <section className="space-y-3">
      <SectionTitle>{t('q.related')}</SectionTitle>
      <div className="grid gap-3">
        {data.items.map((r) => (
          <QuestionRow
            key={r.id}
            q={r}
            companySlug={r.company?.slug ?? ''}
            showCompany={
              r.company && r.company.slug !== q.company.slug ? companyName(r.company) : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}

function CopyLink({
  toast,
  label,
  done,
}: {
  toast: (s: string) => void;
  label: string;
  done: string;
}) {
  return (
    <button
      onClick={() =>
        void navigator.clipboard
          ?.writeText(window.location.href.split('?')[0]!)
          .then(() => toast(done))
      }
      className="text-subtle hover:text-fg flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs"
    >
      <Copy size={13} /> {label}
    </button>
  );
}
