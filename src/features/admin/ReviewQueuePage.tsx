import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadMore, usePaged } from '@/lib/paged';
import { AnimatePresence, m } from 'framer-motion';
import { Building2, Check, Inbox, X } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n } from '@/i18n';
import type { QuestionTagDraft, Submission } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Badges';
import { Input, Textarea } from '@/components/ui/Field';
import { Markdown } from '@/components/ui/Markdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { QuestionTags } from '@/features/questions/QuestionTags';
import { TagPicker } from '@/features/questions/TagPicker';
import { tagsComplete } from '@/features/questions/tags';
import { useToast } from '@/components/ui/Toast';

export function ReviewQueuePage() {
  const { t } = useI18n();
  const list = usePaged<Submission>(keys.admin.review, '/admin/review');
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('admin.review.title')}</h1>
      <div className="mt-6 space-y-4">
        {list.isLoading ? (
          <ListSkeleton />
        ) : !list.items.length ? (
          <EmptyState icon={<Inbox size={20} />} title={t('admin.review.empty')} />
        ) : (
          <AnimatePresence initial={false}>
            {list.items.map((s) => (
              <m.div
                key={s.id}
                layout
                exit={{ opacity: 0, x: 40, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <ReviewCard s={s} />
              </m.div>
            ))}
          </AnimatePresence>
        )}
        <LoadMore {...list} />
      </div>
    </div>
  );
}

function ReviewCard({ s }: { s: Submission }) {
  const { t, fmt } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const [title, setTitle] = useState(s.title);
  const [problem, setProblem] = useState(s.problem);
  const [tags, setTags] = useState<QuestionTagDraft>(() => ({
    field: s.field,
    specializations: s.specializations,
    levels: s.levels,
    stage: s.stage,
    difficulty: s.difficulty,
    topics: s.topics,
  }));
  const done = () => {
    void qc.invalidateQueries({ queryKey: keys.admin.review });
    void qc.invalidateQueries({ queryKey: keys.admin.counts });
    void qc.invalidateQueries({ queryKey: ['companies'] });
  };
  const onError = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : t('common.error'), 'error');
  const approve = useMutation({
    mutationFn: () =>
      api.post(
        `/admin/review/${s.id}/approve`,
        editing ? { edits: { title, problem, ...tags } } : {},
      ),
    onSuccess: done,
    onError,
  });
  const reject = useMutation({
    mutationFn: () => api.post(`/admin/review/${s.id}/reject`, { reason }),
    onSuccess: done,
    onError,
  });

  return (
    <Card className="p-5">
      <div className="text-muted flex flex-wrap items-center gap-2 text-sm">
        {s.company && <span className="text-fg font-medium">{s.company.name}</span>}
        {s.company?.status === 'pending' && (
          <Tag className="text-medium flex items-center gap-1">
            <Building2 size={12} /> {t('admin.review.newCompany')}
          </Tag>
        )}
        <span className="ms-auto text-xs">
          {s.author && t('admin.review.submittedBy', { u: s.author.username })} ·{' '}
          {fmt.relative(s.createdAt)}
        </span>
      </div>
      {editing ? (
        <Input
          className="mt-3 text-lg font-semibold"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      ) : (
        <h2 className="mt-2 text-lg font-semibold">{s.title}</h2>
      )}
      {editing ? (
        <div className="mt-4">
          <TagPicker value={tags} onChange={setTags} />
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <QuestionTags q={s} />
        </div>
      )}
      <div className="bg-surface-2 mt-4 rounded-xl p-4">
        {editing ? (
          <Textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="min-h-40"
          />
        ) : (
          <Markdown html={s.problemHtml} />
        )}
      </div>
      {s.examples.length > 0 && (
        <div className="mt-3 space-y-2">
          <SectionTitle>{t('q.examples')}</SectionTitle>
          {s.examples.map((e, i) => (
            <pre
              key={i}
              dir="ltr"
              className="bg-surface-2 rounded-lg p-3 font-mono text-xs whitespace-pre-wrap"
            >
              {e.input} → {e.output}
              {e.explanation && `\n# ${e.explanation}`}
            </pre>
          ))}
        </div>
      )}
      {s.constraints.length > 0 && (
        <p className="text-muted mt-3 text-sm">{s.constraints.join(' · ')}</p>
      )}
      {s.followUps.length > 0 && (
        <ul className="text-muted mt-3 list-disc ps-5 text-sm">
          {s.followUps.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}

      {rejecting ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            reject.mutate();
          }}
        >
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('admin.review.reason')}
            minLength={3}
            required
            autoFocus
            className="min-h-20"
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRejecting(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="danger" loading={reject.isPending}>
              {t('admin.review.reject')}
            </Button>
          </div>
        </form>
      ) : s.canReview === false ? (
        <p className="text-subtle bg-surface-2 mt-4 rounded-xl px-4 py-3 text-sm">
          {t('review.ownWaiting')}
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {s.own && (
            <span className="text-medium me-auto self-center text-xs">{t('review.ownOnly')}</span>
          )}
          <Button variant="ghost" onClick={() => setEditing((e) => !e)}>
            {t('admin.review.editBefore')}
          </Button>
          <Button onClick={() => setRejecting(true)}>
            <X size={16} /> {t('admin.review.reject')}
          </Button>
          <Button
            variant="primary"
            onClick={() => approve.mutate()}
            loading={approve.isPending}
            disabled={editing && !tagsComplete(tags)}
          >
            <Check size={16} /> {t('admin.review.approve')}
          </Button>
        </div>
      )}
    </Card>
  );
}
