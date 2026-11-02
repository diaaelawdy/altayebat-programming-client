import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { m } from 'framer-motion';
import { Flag, PenLine, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError, qs } from '@/lib/api';
import { keys } from '@/lib/keys';
import { LoadMore } from '@/lib/paged';
import { useI18n } from '@/i18n';
import type { Company, Page, Review } from '@/shared/types';
import { Card } from '@/components/ui/Card';
import { Stars, StarInput } from '@/components/ui/Stars';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { UserChip } from '@/components/ui/UserChip';
import { Tag } from '@/components/ui/Badges';
import { useToast } from '@/components/ui/Toast';
import { useMe } from '@/features/auth/useMe';
import { useCan } from '@/features/auth/Can';
import { VoteButtons, type VoteValue } from '@/features/threads/VoteButtons';
import { ReportDialog } from '@/features/threads/ReportDialog';
import { LEVELS, REVIEW_OUTCOMES } from '@/shared/constants';
import { SpecializationOptions } from '@/features/questions/TagPicker';
import type { MessageKey } from '@/i18n';
import { useConfirm } from '@/components/ui/confirmContext';

type ReviewPage = Page<Review> & { mine: Review | null };
const CATS = ['experience', 'difficulty', 'communication'] as const;

export function RatingsTab({ company }: { company: Company }) {
  const confirm = useConfirm();
  const { t, fmt } = useI18n();
  const { me } = useMe();
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [sort, setSort] = useState<'helpful' | 'newest'>('helpful');
  const [formOpen, setFormOpen] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const key = keys.reviews(company.slug, sort);

  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      api.get<ReviewPage>(`/companies/${company.slug}/reviews${qs({ sort, cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  });
  const reviews = q.data?.pages.flatMap((p) => p.items) ?? [];
  const mine = q.data?.pages[0]?.mine ?? null;
  const r = company.rating;
  const maxBucket = Math.max(1, ...r.distribution);

  const vote = useMutation({
    mutationFn: ({ id, value }: { id: string; value: VoteValue }) =>
      api.put('/votes', { targetType: 'review', targetId: id, value }),
    onMutate: async ({ id, value }) => {
      const prev = qc.getQueryData<InfiniteData<ReviewPage>>(key);
      qc.setQueryData<InfiniteData<ReviewPage>>(
        key,
        (d) =>
          d && {
            ...d,
            pages: d.pages.map((p) => ({
              ...p,
              items: p.items.map((x) =>
                x.id === id ? { ...x, myVote: value, score: x.score - x.myVote + value } : x,
              ),
            })),
          },
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast(e instanceof ApiError ? e.message : t('common.error'), 'error');
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/reviews/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews', company.slug] });
      void qc.invalidateQueries({ queryKey: keys.company(company.slug) });
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          {r.count === 0 ? (
            <p className="text-muted text-sm">{t('ratings.none')}</p>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-semibold tabular-nums">{r.overall.toFixed(1)}</span>
                <div className="pb-1.5">
                  <Stars value={r.overall} size={16} />
                  <p className="text-subtle mt-1 text-xs">
                    {t('ratings.count', { n: fmt.number(r.count) })}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-1.5">
                {[5, 4, 3, 2, 1].map((s) => (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    <span className="text-subtle w-3 tabular-nums">{s}</span>
                    <Star size={11} className="fill-star text-star" />
                    <div className="bg-surface-3 h-2 flex-1 overflow-hidden rounded-full">
                      <m.div
                        className="bg-star h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(r.distribution[s - 1]! / maxBucket) * 100}%` }}
                        transition={{ duration: 0.6, delay: (5 - s) * 0.05 }}
                      />
                    </div>
                    <span className="text-subtle w-6 text-end tabular-nums">
                      {r.distribution[s - 1]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-border mt-5 space-y-3 border-t pt-4">
                {CATS.map((c) => (
                  <div key={c}>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">{t(`ratings.${c}`)}</span>
                      <span className="font-medium tabular-nums">{r[c].toFixed(1)}</span>
                    </div>
                    <div className="bg-surface-3 mt-1 h-1.5 overflow-hidden rounded-full">
                      <m.div
                        className="bg-accent h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(r[c] / 5) * 100}%` }}
                        transition={{ duration: 0.7 }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-subtle text-[11px]">{t('ratings.diffScale')}</p>
              </div>
            </>
          )}
        </Card>
        {can('ratings.create') ? (
          <Button variant="primary" className="w-full" onClick={() => setFormOpen(true)}>
            <PenLine size={16} /> {mine ? t('ratings.edit') : t('ratings.rate')}
          </Button>
        ) : (
          !me && (
            <ButtonLink to="/login" variant="soft" className="w-full">
              {t('ratings.rate')}
            </ButtonLink>
          )
        )}
        <p className="text-subtle text-xs">{t('ratings.anonNote')}</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-end">
          <Segmented
            value={sort}
            onChange={setSort}
            items={[
              { value: 'helpful', label: t('sort.helpful') },
              { value: 'newest', label: t('sort.newest') },
            ]}
          />
        </div>
        {q.isLoading ? (
          <ListSkeleton rows={3} />
        ) : reviews.length === 0 ? (
          <EmptyState icon={<Star size={20} />} title={t('ratings.empty')} />
        ) : (
          reviews.map((rv, i) => {
            const own = rv.author.id === me?.id;
            return (
              <m.article
                key={rv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
                className="border-border bg-surface rounded-2xl border p-5"
              >
                <header className="flex flex-wrap items-center gap-2 text-sm">
                  <UserChip user={rv.author} />
                  <span className="text-subtle text-xs">· {fmt.month(rv.month)}</span>
                  <span className="ms-auto">
                    <Stars value={rv.overall} />
                  </span>
                </header>
                {rv.title && <h3 className="mt-3 font-semibold">{rv.title}</h3>}
                {rv.body && (
                  <p className="text-muted mt-1.5 text-[15px] leading-relaxed whitespace-pre-line">
                    {rv.body}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {rv.outcome && <Tag>{t(`outcome.${rv.outcome}` as MessageKey)}</Tag>}
                  {rv.specialization && <Tag>{rv.specialization}</Tag>}
                  {rv.level && <Tag>{rv.level}</Tag>}
                  {CATS.map((c) => (
                    <Tag key={c}>
                      {t(`ratings.${c}`)}: {rv[c]}/5
                    </Tag>
                  ))}
                </div>
                <footer className="text-subtle mt-3 flex items-center gap-2 text-xs">
                  <VoteButtons
                    orientation="horizontal"
                    score={rv.score}
                    myVote={rv.myVote}
                    onVote={(v) => vote.mutate({ id: rv.id, value: v })}
                    disabledReason={
                      own ? t('vote.own') : !can('answers.vote') ? t('vote.signIn') : null
                    }
                  />
                  <span>{t('ratings.helpful')}</span>
                  <span className="ms-auto flex gap-1">
                    {(own || can('ratings.delete_any')) && (
                      <button
                        className="hover:bg-surface-2 hover:text-fg flex items-center gap-1 rounded-md px-2 py-1"
                        onClick={() =>
                          void confirm({ title: t('thread.confirmDelete') }).then(
                            (ok) => ok && remove.mutate(rv.id),
                          )
                        }
                      >
                        <Trash2 size={13} /> {t('common.delete')}
                      </button>
                    )}
                    {me && !own && (
                      <button
                        className="hover:bg-surface-2 hover:text-fg flex items-center gap-1 rounded-md px-2 py-1"
                        onClick={() => setReport(rv.id)}
                      >
                        <Flag size={13} /> {t('common.report')}
                      </button>
                    )}
                  </span>
                </footer>
              </m.article>
            );
          })
        )}
        <LoadMore {...q} />
      </div>
      <ReviewForm
        key={mine ? `${mine.id}-${mine.overall}` : 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        company={company}
        initial={mine}
      />
      <ReportDialog
        target={report ? { type: 'review', id: report } : null}
        onClose={() => setReport(null)}
      />
    </div>
  );
}

function ReviewForm({
  open,
  onClose,
  company,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  company: Company;
  initial: Review | null;
}) {
  const { t, companyName } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [v, setV] = useState(() => ({
    overall: initial?.overall ?? 0,
    experience: initial?.experience ?? 0,
    difficulty: initial?.difficulty ?? 0,
    communication: initial?.communication ?? 0,
    outcome: initial?.outcome ?? '',
    specialization: initial?.specialization ?? '',
    level: initial?.level ?? '',
    title: initial?.title ?? '',
    body: initial?.body ?? '',
  }));
  const save = useMutation({
    mutationFn: () => api.put<Review>(`/companies/${company.slug}/reviews/mine`, v),
    onSuccess: () => {
      toast(t('common.saved'));
      void qc.invalidateQueries({ queryKey: ['reviews', company.slug] });
      void qc.invalidateQueries({ queryKey: keys.company(company.slug) });
      void qc.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.error'), 'error'),
  });
  const ready = v.overall && v.experience && v.difficulty && v.communication;
  const stars = [
    ['overall', t('ratings.overall')],
    ['experience', t('ratings.experience')],
    ['difficulty', `${t('ratings.difficulty')} (${t('ratings.diffScale')})`],
    ['communication', t('ratings.communication')],
  ] as const;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${initial ? t('ratings.edit') : t('ratings.rate')} — ${companyName(company)}`}
      description={t('ratings.anonNote')}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-3">
          {stars.map(([k, label]) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">{label}</span>
              <StarInput
                label={label}
                value={v[k]}
                onChange={(n) => setV((s) => ({ ...s, [k]: n }))}
              />
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('ratings.outcome')} optional={t('common.optional')}>
            {(id) => (
              <Select
                id={id}
                value={v.outcome}
                onChange={(e) => setV((s) => ({ ...s, outcome: e.target.value }))}
              >
                <option value="">—</option>
                {REVIEW_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {t(`outcome.${o}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('ratings.specialization')} optional={t('common.optional')}>
            {(id) => (
              <Select
                id={id}
                value={v.specialization}
                onChange={(e) => setV((s) => ({ ...s, specialization: e.target.value }))}
              >
                <option value="">—</option>
                <SpecializationOptions />
              </Select>
            )}
          </Field>
          <Field label={t('ratings.level')} optional={t('common.optional')}>
            {(id) => (
              <Select
                id={id}
                value={v.level}
                onChange={(e) => setV((s) => ({ ...s, level: e.target.value }))}
              >
                <option value="">—</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label={t('ratings.reviewTitle')} optional={t('common.optional')}>
          {(id) => (
            <Input
              id={id}
              maxLength={120}
              value={v.title}
              onChange={(e) => setV((s) => ({ ...s, title: e.target.value }))}
            />
          )}
        </Field>
        <Field
          label={t('ratings.body')}
          hint={t('ratings.bodyHint')}
          optional={t('common.optional')}
        >
          {(id) => (
            <Textarea
              id={id}
              maxLength={4000}
              value={v.body}
              onChange={(e) => setV((s) => ({ ...s, body: e.target.value }))}
            />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" disabled={!ready} loading={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
